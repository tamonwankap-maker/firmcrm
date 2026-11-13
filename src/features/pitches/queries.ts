import "server-only";
import { z } from "zod";
import type { Prisma } from "@/generated/prisma/client";
import { db } from "@/server/db";
import { opportunityMemberWhere, pitchVisibleWhere, taskVisibleWhere } from "@/server/auth/visibility";
import type { Actor } from "@/server/auth/policy";
import { listParamsSchema, pageArgs } from "@/lib/list-params";
import { taskInclude } from "../tasks/queries";

export const pitchListInclude = {
  owner: { select: { id: true, name: true } },
  opportunity: {
    select: {
      id: true,
      name: true,
      confidential: true,
      leadPartnerId: true,
      team: { select: { id: true } },
      leadPartner: { select: { name: true } },
      organisation: { select: { id: true, nameEn: true } },
    },
  },
  checklist: { orderBy: { sortOrder: "asc" } },
} satisfies Prisma.PitchInclude;
export type PitchRow = Prisma.PitchGetPayload<{ include: typeof pitchListInclude }>;

export const pitchFilterSchema = listParamsSchema.extend({
  status: z.enum(["open", "submitted", "all"]).catch("open"),
  mine: z.enum(["1"]).optional().catch(undefined),
});
export type PitchFilter = z.infer<typeof pitchFilterSchema>;

export async function listPitches(actor: Actor, f: PitchFilter) {
  const where: Prisma.PitchWhereInput = {
    AND: [
      pitchVisibleWhere(actor),
      f.status === "open" ? { status: { not: "SUBMITTED" } } : f.status === "submitted" ? { status: "SUBMITTED" } : {},
      f.mine ? { OR: [{ ownerId: actor.id }, { opportunity: opportunityMemberWhere(actor) }] } : {},
      f.q
        ? {
            opportunity: {
              OR: [
                { name: { contains: f.q, mode: "insensitive" } },
                { organisation: { nameEn: { contains: f.q, mode: "insensitive" } } },
              ],
            },
          }
        : {},
    ],
  };
  const [total, rows] = await Promise.all([
    db.pitch.count({ where }),
    db.pitch.findMany({
      where,
      orderBy: { deadline: f.status === "submitted" ? "desc" : "asc" },
      ...pageArgs(f.page),
      include: pitchListInclude,
    }),
  ]);
  return { total, rows };
}

export function getPitch(actor: Actor, id: string) {
  return db.pitch.findFirst({
    where: { AND: [{ id }, pitchVisibleWhere(actor)] },
    include: {
      ...pitchListInclude,
      tasks: {
        where: { AND: [taskVisibleWhere(actor), { status: { in: ["OPEN", "IN_PROGRESS"] } }] },
        include: taskInclude,
      },
    },
  });
}

/** Upcoming deadlines for pitches I own or whose opportunity I'm on. */
export function myUpcomingPitches(actor: Actor, take = 8) {
  return db.pitch.findMany({
    where: {
      AND: [
        pitchVisibleWhere(actor),
        { status: { not: "SUBMITTED" } },
        { OR: [{ ownerId: actor.id }, { opportunity: opportunityMemberWhere(actor) }] },
      ],
    },
    orderBy: { deadline: "asc" },
    take,
    include: pitchListInclude,
  });
}
