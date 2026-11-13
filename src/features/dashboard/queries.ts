import "server-only";
import { db } from "@/server/db";
import { activityVisibleWhere } from "@/server/auth/visibility";
import type { Actor } from "@/server/auth/policy";
import { todayInBangkok } from "@/lib/dates";

export async function dashboardStats(actor: Actor) {
  const today = todayInBangkok();
  const monthStart = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 1));
  const [myOrgs, myContacts, myActivitiesThisMonth, overdueNextActions] = await Promise.all([
    db.organisation.count({ where: { archivedAt: null, relationshipPartnerId: actor.id } }),
    db.contact.count({ where: { archivedAt: null, owners: { some: { id: actor.id } } } }),
    db.activity.count({
      where: {
        AND: [
          activityVisibleWhere(actor),
          { date: { gte: monthStart } },
          { OR: [{ ownerId: actor.id }, { internalAttendees: { some: { id: actor.id } } }] },
        ],
      },
    }),
    db.activity.count({
      where: {
        AND: [activityVisibleWhere(actor), { ownerId: actor.id, nextActionDone: false, nextActionDue: { lt: today } }],
      },
    }),
  ]);
  return { myOrgs, myContacts, myActivitiesThisMonth, overdueNextActions };
}

export function recentActivities(actor: Actor, take = 8) {
  return db.activity.findMany({
    where: activityVisibleWhere(actor),
    orderBy: [{ date: "desc" }, { createdAt: "desc" }],
    take,
    include: {
      owner: { select: { id: true, name: true } },
      organisation: { select: { id: true, nameEn: true } },
      opportunity: { select: { id: true, name: true } },
      contacts: { select: { id: true, nameEn: true, nameTh: true } },
      internalAttendees: { select: { id: true, name: true } },
      practiceAreas: { select: { id: true, name: true } },
    },
  });
}
