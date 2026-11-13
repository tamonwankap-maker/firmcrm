import "server-only";
import { db } from "@/server/db";
import { textSearchWhere } from "@/server/text-search";
import type { Actor } from "@/server/auth/policy";
import { matterVisibleWhere, opportunityVisibleWhere } from "@/server/auth/visibility";

/** Global search across organisations, contacts and (visible) opportunities. */
export async function globalSearch(actor: Actor, q: string) {
  const orgWhere = { archivedAt: null, ...textSearchWhere(["nameEn", "nameTh"], q) };
  const contactWhere = { archivedAt: null, ...textSearchWhere(["nameEn", "nameTh", "email"], q) };
  const oppWhere = {
    AND: [
      opportunityVisibleWhere(actor),
      { OR: [textSearchWhere(["name"], q), { organisation: textSearchWhere(["nameEn", "nameTh"], q) }] },
    ],
  };
  const [orgs, orgCount, contacts, contactCount, opps, matters] = await Promise.all([
    db.organisation.findMany({
      where: orgWhere,
      take: 20,
      orderBy: [{ isKeyClient: "desc" }, { nameEn: "asc" }],
      select: { id: true, nameEn: true, nameTh: true, type: true, isKeyClient: true },
    }),
    db.organisation.count({ where: orgWhere }),
    db.contact.findMany({
      where: contactWhere,
      take: 20,
      orderBy: { nameEn: "asc" },
      select: {
        id: true,
        nameEn: true,
        nameTh: true,
        email: true,
        title: true,
        organisation: { select: { nameEn: true } },
      },
    }),
    db.contact.count({ where: contactWhere }),
    db.opportunity.findMany({
      where: oppWhere,
      take: 10,
      orderBy: { updatedAt: "desc" },
      select: { id: true, name: true, stage: true, confidential: true, organisation: { select: { nameEn: true } } },
    }),
    db.representativeMatter.findMany({
      where: { AND: [matterVisibleWhere(actor), textSearchWhere(["title", "description", "clientDisplayName"], q)] },
      take: 10,
      orderBy: { year: "desc" },
      select: { id: true, title: true, year: true, confidential: true },
    }),
  ]);
  return { orgs, orgCount, contacts, contactCount, opps, matters };
}
