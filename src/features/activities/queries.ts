import "server-only";
import { z } from "zod";
import type { Prisma } from "@/generated/prisma/client";
import { db } from "@/server/db";
import { activityVisibleWhere } from "@/server/auth/visibility";
import type { Actor } from "@/server/auth/policy";
import { textSearchWhere } from "@/server/text-search";
import { listParamsSchema, pageArgs, zOptEnum, zOptFilterId } from "@/lib/list-params";
import { parseDateOnly, todayInBangkok } from "@/lib/dates";
import { ACTIVITY_TYPES } from "../labels";

export const activityInclude = {
  owner: { select: { id: true, name: true } },
  organisation: { select: { id: true, nameEn: true } },
  opportunity: { select: { id: true, name: true } },
  contacts: { select: { id: true, nameEn: true, nameTh: true } },
  internalAttendees: { select: { id: true, name: true } },
  practiceAreas: { select: { id: true, name: true } },
} satisfies Prisma.ActivityInclude;

export type ActivityWithRelations = Prisma.ActivityGetPayload<{ include: typeof activityInclude }>;

export const activityFilterSchema = listParamsSchema.extend({
  type: zOptEnum(ACTIVITY_TYPES),
  owner: zOptFilterId,
  org: zOptFilterId,
  from: z.string().optional().catch(undefined),
  to: z.string().optional().catch(undefined),
  mine: z.enum(["1"]).optional().catch(undefined),
});
export type ActivityFilter = z.infer<typeof activityFilterSchema>;

export async function listActivities(actor: Actor, f: ActivityFilter) {
  const from = f.from ? parseDateOnly(f.from) : null;
  const to = f.to ? parseDateOnly(f.to) : null;
  const where: Prisma.ActivityWhereInput = {
    AND: [
      activityVisibleWhere(actor),
      f.type ? { type: f.type } : {},
      f.owner ? { ownerId: f.owner } : {},
      f.mine ? { OR: [{ ownerId: actor.id }, { internalAttendees: { some: { id: actor.id } } }] } : {},
      f.org ? { organisationId: f.org } : {},
      from || to ? { date: { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) } } : {},
      textSearchWhere(["summary", "nextAction"], f.q),
    ],
  };
  const [total, rows] = await Promise.all([
    db.activity.count({ where }),
    db.activity.findMany({
      where,
      orderBy: [{ date: "desc" }, { createdAt: "desc" }],
      ...pageArgs(f.page),
      include: activityInclude,
    }),
  ]);
  return { total, rows };
}

export function activitiesFor(actor: Actor, scope: { organisationId?: string; contactId?: string }, take = 30) {
  return db.activity.findMany({
    where: {
      AND: [
        activityVisibleWhere(actor),
        scope.organisationId ? { organisationId: scope.organisationId } : {},
        scope.contactId ? { contacts: { some: { id: scope.contactId } } } : {},
      ],
    },
    orderBy: [{ date: "desc" }, { createdAt: "desc" }],
    take,
    include: activityInclude,
  });
}

export function getActivity(actor: Actor, id: string) {
  return db.activity.findFirst({ where: { AND: [{ id }, activityVisibleWhere(actor)] }, include: activityInclude });
}

/** Open next actions owned by the user, overdue first. */
export function myNextActions(actor: Actor, take = 15) {
  return db.activity.findMany({
    where: {
      AND: [activityVisibleWhere(actor), { ownerId: actor.id, nextAction: { not: null }, nextActionDone: false }],
    },
    orderBy: [{ nextActionDue: { sort: "asc", nulls: "last" } }, { date: "desc" }],
    take,
    include: activityInclude,
  });
}

export { todayInBangkok };
