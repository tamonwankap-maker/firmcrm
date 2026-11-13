import "server-only";
import { z } from "zod";
import type { Prisma } from "@/generated/prisma/client";
import { db } from "@/server/db";
import type { Actor } from "@/server/auth/policy";
import { taskVisibleWhere } from "@/server/auth/visibility";
import { listParamsSchema, pageArgs, zOptEnum } from "@/lib/list-params";
import { EVENT_STATUSES } from "../labels";
import { taskInclude } from "../tasks/queries";

export const eventListInclude = {
  owner: { select: { id: true, name: true } },
  speakers: { select: { id: true, name: true } },
  practiceAreas: { select: { id: true, name: true } },
  invites: { select: { invited: true, rsvp: true, attended: true, followUpOwnerId: true, followUpDone: true } },
} satisfies Prisma.EventInclude;

export const eventFilterSchema = listParamsSchema.extend({
  when: z.enum(["upcoming", "past", "all"]).catch("upcoming"),
  status: zOptEnum(EVENT_STATUSES),
});

export async function listEvents(f: z.infer<typeof eventFilterSchema>) {
  const now = new Date();
  const where: Prisma.EventWhereInput = {
    archivedAt: f.archived ? { not: null } : null,
    ...(f.when === "upcoming"
      ? { startsAt: { gte: new Date(now.getTime() - 86_400_000) } }
      : f.when === "past"
        ? { startsAt: { lt: now } }
        : {}),
    ...(f.status ? { status: f.status } : {}),
    ...(f.q ? { title: { contains: f.q, mode: "insensitive" } } : {}),
  };
  const [total, rows] = await Promise.all([
    db.event.count({ where }),
    db.event.findMany({
      where,
      orderBy: { startsAt: f.when === "past" ? "desc" : "asc" },
      ...pageArgs(f.page),
      include: eventListInclude,
    }),
  ]);
  return { total, rows };
}

export function getEvent(actor: Actor, id: string) {
  return db.event.findUnique({
    where: { id },
    include: {
      ...eventListInclude,
      invites: {
        orderBy: { contact: { nameEn: "asc" } },
        include: {
          contact: {
            select: {
              id: true,
              nameEn: true,
              nameTh: true,
              title: true,
              organisation: { select: { id: true, nameEn: true } },
              consents: { where: { list: "EVENT_INVITES" }, select: { list: true, optedIn: true } },
            },
          },
          followUpOwner: { select: { id: true, name: true } },
        },
      },
      tasks: {
        where: { AND: [taskVisibleWhere(actor), { status: { in: ["OPEN", "IN_PROGRESS"] } }] },
        include: taskInclude,
      },
    },
  });
}
export type EventDetail = NonNullable<Awaited<ReturnType<typeof getEvent>>>;

/** Follow-ups assigned to me for contacts who attended. */
export function myEventFollowUps(actor: Actor, take = 10) {
  return db.eventInvite.findMany({
    where: { followUpOwnerId: actor.id, followUpDone: false, attended: true, event: { archivedAt: null } },
    orderBy: { event: { startsAt: "desc" } },
    take,
    include: {
      contact: { select: { id: true, nameEn: true, organisation: { select: { nameEn: true } } } },
      event: { select: { id: true, title: true, startsAt: true } },
    },
  });
}

export function upcomingEvents(take = 5) {
  return db.event.findMany({
    where: { archivedAt: null, status: { not: "CANCELLED" }, startsAt: { gte: new Date() } },
    orderBy: { startsAt: "asc" },
    take,
    include: { invites: { select: { rsvp: true } } },
  });
}

/** Events a contact was invited to (contact page). */
export function eventHistory(contactId: string) {
  return db.eventInvite.findMany({
    where: { contactId, event: { archivedAt: null } },
    orderBy: { event: { startsAt: "desc" } },
    include: { event: { select: { id: true, title: true, startsAt: true } } },
  });
}
