import "server-only";
import { z } from "zod";
import type { Prisma } from "@/generated/prisma/client";
import { db } from "@/server/db";
import type { Actor } from "@/server/auth/policy";
import { opportunityVisibleWhere, taskVisibleWhere } from "@/server/auth/visibility";
import { listParamsSchema, pageArgs } from "@/lib/list-params";
import { OPEN_STAGES } from "../labels";
import { taskInclude } from "../tasks/queries";
import { crossSellGaps, distinctPractices } from "./rules";

export const planListInclude = {
  organisation: {
    select: {
      id: true,
      nameEn: true,
      nameTh: true,
      isKeyClient: true,
      relationshipPartnerId: true,
      relationshipPartner: { select: { name: true } },
    },
  },
  owner: { select: { id: true, name: true } },
  crossSellTargets: { select: { id: true, name: true } },
} satisfies Prisma.ClientPlanInclude;

export const planFilterSchema = listParamsSchema.extend({
  year: z.coerce.number().int().min(2000).max(2100).optional().catch(undefined),
  health: z.coerce.number().int().min(1).max(5).optional().catch(undefined),
  mine: z.enum(["1"]).optional().catch(undefined),
});

export async function listClientPlans(actor: Actor, f: z.infer<typeof planFilterSchema>) {
  const where: Prisma.ClientPlanWhereInput = {
    archivedAt: f.archived ? { not: null } : null,
    ...(f.year ? { year: f.year } : {}),
    ...(f.health ? { healthScore: { lte: f.health } } : {}),
    ...(f.mine ? { OR: [{ ownerId: actor.id }, { organisation: { relationshipPartnerId: actor.id } }] } : {}),
    ...(f.q
      ? {
          organisation: {
            OR: [
              { nameEn: { contains: f.q, mode: "insensitive" } },
              { nameTh: { contains: f.q, mode: "insensitive" } },
            ],
          },
        }
      : {}),
  };
  const [total, rows] = await Promise.all([
    db.clientPlan.count({ where }),
    db.clientPlan.findMany({
      where,
      orderBy: [{ healthScore: "asc" }, { organisation: { nameEn: "asc" } }],
      ...pageArgs(f.page, 50),
      include: planListInclude,
    }),
  ]);
  return { total, rows };
}

/** Plan with cross-sell analysis based on the opportunities this user can see. */
export async function getClientPlan(actor: Actor, id: string) {
  const plan = await db.clientPlan.findUnique({
    where: { id },
    include: {
      ...planListInclude,
      tasks: {
        where: { AND: [taskVisibleWhere(actor), { status: { in: ["OPEN", "IN_PROGRESS"] } }] },
        include: taskInclude,
      },
    },
  });
  if (!plan) return null;
  const since = new Date(Date.UTC(plan.year - 3, 0, 1));
  const opps = await db.opportunity.findMany({
    where: { AND: [{ organisationId: plan.organisationId }, opportunityVisibleWhere(actor)] },
    select: { stage: true, closedDate: true, practiceAreas: { select: { id: true, name: true } } },
  });
  const won = opps.filter((o) => o.stage === "WON" && (!o.closedDate || o.closedDate >= since));
  const open = opps.filter((o) => (OPEN_STAGES as readonly string[]).includes(o.stage));
  const usedWon = distinctPractices(won);
  const openPipeline = distinctPractices(open);
  return {
    plan,
    usedWon,
    openPipeline,
    gaps: crossSellGaps({ targets: plan.crossSellTargets, usedWon, openPipeline }),
  };
}

export function plansForOrganisation(organisationId: string) {
  return db.clientPlan.findMany({
    where: { organisationId, archivedAt: null },
    orderBy: { year: "desc" },
    include: planListInclude,
    take: 5,
  });
}
