import "server-only";
import { z } from "zod";
import type { Prisma } from "@/generated/prisma/client";
import { db } from "@/server/db";
import {
  activityVisibleWhere,
  opportunityMemberWhere,
  opportunityVisibleWhere,
  taskVisibleWhere,
} from "@/server/auth/visibility";
import type { Actor } from "@/server/auth/policy";
import { textSearchWhere } from "@/server/text-search";
import { listParamsSchema, pageArgs, zOptEnum, zOptFilterId } from "@/lib/list-params";
import { todayInBangkok } from "@/lib/dates";
import { CONFLICT_STATUSES, OPEN_STAGES, OPP_SOURCES, STAGES } from "../labels";
import { activityInclude } from "../activities/queries";
import { taskInclude } from "../tasks/queries";
import { summarisePipeline } from "./summary";

export const oppListInclude = {
  organisation: { select: { id: true, nameEn: true, nameTh: true } },
  leadPartner: { select: { id: true, name: true } },
  team: { select: { id: true, name: true } },
  practiceAreas: { select: { id: true, name: true } },
  pitches: {
    where: { archivedAt: null, status: { not: "SUBMITTED" } },
    select: { deadline: true },
    orderBy: { deadline: "asc" },
    take: 1,
  },
} satisfies Prisma.OpportunityInclude;
export type OppListRow = Prisma.OpportunityGetPayload<{ include: typeof oppListInclude }>;

export const oppFilterSchema = listParamsSchema.extend({
  status: z.enum(["open", "won", "lost", "closed", "all"]).catch("open"),
  stage: zOptEnum(STAGES),
  lead: zOptFilterId,
  practice: zOptFilterId,
  source: zOptEnum(OPP_SOURCES),
  conflict: zOptEnum(CONFLICT_STATUSES),
  mine: z.enum(["1"]).optional().catch(undefined),
  org: zOptFilterId,
});
export type OppFilter = z.infer<typeof oppFilterSchema>;

export function oppWhere(actor: Actor, f: OppFilter): Prisma.OpportunityWhereInput {
  const statusWhere: Prisma.OpportunityWhereInput =
    f.status === "open"
      ? { stage: { in: [...OPEN_STAGES] } }
      : f.status === "won"
        ? { stage: "WON" }
        : f.status === "lost"
          ? { stage: "LOST" }
          : f.status === "closed"
            ? { stage: { in: ["WON", "LOST"] } }
            : {};
  return {
    AND: [
      opportunityVisibleWhere(actor, { includeArchived: f.archived }),
      f.archived ? { archivedAt: { not: null } } : {},
      statusWhere,
      f.stage ? { stage: f.stage } : {},
      f.lead ? { leadPartnerId: f.lead } : {},
      f.practice ? { practiceAreas: { some: { id: f.practice } } } : {},
      f.source ? { source: f.source } : {},
      f.conflict ? { conflictStatus: f.conflict } : {},
      f.org ? { organisationId: f.org } : {},
      f.mine ? opportunityMemberWhere(actor) : {},
      f.q ? { OR: [textSearchWhere(["name"], f.q), { organisation: textSearchWhere(["nameEn", "nameTh"], f.q) }] } : {},
    ],
  };
}

export async function listOpportunities(actor: Actor, f: OppFilter) {
  const where = oppWhere(actor, f);
  const [total, rows] = await Promise.all([
    db.opportunity.count({ where }),
    db.opportunity.findMany({
      where,
      orderBy: [{ expectedDecisionDate: { sort: "asc", nulls: "last" } }, { updatedAt: "desc" }],
      ...pageArgs(f.page),
      include: oppListInclude,
    }),
  ]);
  return { total, rows };
}

/** Board: all open opportunities plus anything won/lost in the last 90 days. */
export function boardOpportunities(actor: Actor, f: OppFilter) {
  const since = new Date(todayInBangkok().getTime() - 90 * 86_400_000);
  return db.opportunity.findMany({
    where: {
      AND: [
        oppWhere(actor, { ...f, status: "all", stage: undefined }),
        { OR: [{ stage: { in: [...OPEN_STAGES] } }, { stage: { in: ["WON", "LOST"] }, closedDate: { gte: since } }] },
      ],
    },
    orderBy: [{ expectedDecisionDate: { sort: "asc", nulls: "last" } }, { updatedAt: "desc" }],
    take: 500,
    include: oppListInclude,
  });
}

export async function getOpportunityDetail(actor: Actor, id: string) {
  return db.opportunity.findFirst({
    where: { AND: [{ id }, opportunityVisibleWhere(actor, { includeArchived: true })] },
    include: {
      ...oppListInclude,
      referrerOrg: { select: { id: true, nameEn: true } },
      referrerContact: { select: { id: true, nameEn: true } },
      createdBy: { select: { name: true } },
      stageChanges: { orderBy: { changedAt: "desc" }, include: { changedBy: { select: { name: true } } } },
      pitches: {
        where: { archivedAt: null },
        orderBy: { deadline: "asc" },
        include: { owner: { select: { name: true } }, checklist: { select: { done: true } } },
      },
      activities: {
        where: activityVisibleWhere(actor),
        orderBy: [{ date: "desc" }],
        take: 30,
        include: activityInclude,
      },
      tasks: {
        where: { AND: [taskVisibleWhere(actor), { status: { in: ["OPEN", "IN_PROGRESS"] } }] },
        include: taskInclude,
      },
    },
  });
}
export type OpportunityDetail = NonNullable<Awaited<ReturnType<typeof getOpportunityDetail>>>;

/**
 * Firm-wide summary. Deliberately reads ALL opportunities (no visibility filter) but returns
 * aggregates only — confidential deals are counted, never named (CLAUDE.md rule 3).
 */
export async function pipelineSummary(usdToThbRate: number) {
  const today = todayInBangkok();
  const yearStart = new Date(Date.UTC(today.getUTCFullYear(), 0, 1));
  const rows = await db.opportunity.findMany({
    where: { archivedAt: null },
    select: {
      stage: true,
      source: true,
      confidential: true,
      feeEstimateMin: true,
      feeEstimateMax: true,
      currency: true,
      probability: true,
      closedDate: true,
      outcomeReason: true,
      practiceAreas: { select: { name: true } },
    },
  });
  return { ...summarisePipeline(rows, usdToThbRate, yearStart), yearLabel: today.getUTCFullYear() };
}

/** My open opportunities (lead or team), for the dashboard. */
export function myOpenOpportunities(actor: Actor, take = 10) {
  return db.opportunity.findMany({
    where: { AND: [{ archivedAt: null, stage: { in: [...OPEN_STAGES] } }, opportunityMemberWhere(actor)] },
    orderBy: [{ expectedDecisionDate: { sort: "asc", nulls: "last" } }],
    take,
    include: oppListInclude,
  });
}

export function opportunitiesForOrganisation(actor: Actor, organisationId: string) {
  return db.opportunity.findMany({
    where: { AND: [{ organisationId }, opportunityVisibleWhere(actor)] },
    orderBy: [{ updatedAt: "desc" }],
    take: 50,
    include: oppListInclude,
  });
}
