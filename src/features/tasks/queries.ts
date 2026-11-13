import "server-only";
import { z } from "zod";
import type { Prisma } from "@/generated/prisma/client";
import { db } from "@/server/db";
import { taskVisibleWhere } from "@/server/auth/visibility";
import type { Actor } from "@/server/auth/policy";
import { listParamsSchema, pageArgs, zOptFilterId } from "@/lib/list-params";

export const taskInclude = {
  owner: { select: { id: true, name: true } },
  organisation: { select: { id: true, nameEn: true } },
  contact: { select: { id: true, nameEn: true } },
  opportunity: { select: { id: true, name: true } },
  pitch: { select: { id: true, opportunity: { select: { name: true } } } },
} satisfies Prisma.TaskInclude;
export type TaskWithRelations = Prisma.TaskGetPayload<{ include: typeof taskInclude }>;

export const taskFilterSchema = listParamsSchema.extend({
  scope: z.enum(["mine", "all"]).catch("mine"),
  status: z.enum(["open", "done", "all"]).catch("open"),
  owner: zOptFilterId,
});
export type TaskFilter = z.infer<typeof taskFilterSchema>;

export async function listTasks(actor: Actor, f: TaskFilter) {
  const seeAll = actor.role === "ADMIN" || actor.role === "BD";
  const where: Prisma.TaskWhereInput = {
    AND: [
      taskVisibleWhere(actor),
      f.scope === "all" && seeAll ? (f.owner ? { ownerId: f.owner } : {}) : { ownerId: actor.id },
      f.status === "open"
        ? { status: { in: ["OPEN", "IN_PROGRESS"] } }
        : f.status === "done"
          ? { status: { in: ["DONE", "CANCELLED"] } }
          : {},
      f.q ? { title: { contains: f.q, mode: "insensitive" } } : {},
    ],
  };
  const [total, rows] = await Promise.all([
    db.task.count({ where }),
    db.task.findMany({
      where,
      orderBy: [{ dueDate: { sort: "asc", nulls: "last" } }, { createdAt: "desc" }],
      ...pageArgs(f.page),
      include: taskInclude,
    }),
  ]);
  return { total, rows };
}

export function tasksFor(
  actor: Actor,
  scope: { organisationId?: string; contactId?: string; opportunityId?: string; pitchId?: string },
) {
  return db.task.findMany({
    where: {
      AND: [
        taskVisibleWhere(actor),
        scope.organisationId ? { organisationId: scope.organisationId } : {},
        scope.contactId ? { contactId: scope.contactId } : {},
        scope.opportunityId ? { opportunityId: scope.opportunityId } : {},
        scope.pitchId ? { pitchId: scope.pitchId } : {},
        { status: { in: ["OPEN", "IN_PROGRESS"] } },
      ],
    },
    orderBy: [{ dueDate: { sort: "asc", nulls: "last" } }],
    include: taskInclude,
  });
}

export function myOpenTasks(actor: Actor, take = 15) {
  return db.task.findMany({
    where: { AND: [taskVisibleWhere(actor), { ownerId: actor.id, status: { in: ["OPEN", "IN_PROGRESS"] } }] },
    orderBy: [{ dueDate: { sort: "asc", nulls: "last" } }],
    take,
    include: taskInclude,
  });
}

export function getTask(actor: Actor, id: string) {
  return db.task.findFirst({ where: { AND: [{ id }, taskVisibleWhere(actor)] }, include: taskInclude });
}
