import "server-only";
import { z } from "zod";
import type { Prisma } from "@/generated/prisma/client";
import { db } from "@/server/db";
import { textSearchWhere } from "@/server/text-search";
import type { Actor } from "@/server/auth/policy";
import { listParamsSchema, pageArgs, zOptFilterId } from "@/lib/list-params";
import { MAILING_LISTS } from "../labels";

export const contactFilterSchema = listParamsSchema.extend({
  org: zOptFilterId,
  owner: zOptFilterId,
  tag: zOptFilterId,
  strength: z.coerce.number().int().min(1).max(5).optional().catch(undefined),
  consent: z.enum(MAILING_LISTS).optional().catch(undefined),
  mine: z.enum(["1"]).optional().catch(undefined),
});
export type ContactFilter = z.infer<typeof contactFilterSchema>;

export function contactWhere(actor: Actor, f: ContactFilter): Prisma.ContactWhereInput {
  return {
    archivedAt: f.archived ? { not: null } : null,
    ...(f.org ? { organisationId: f.org } : {}),
    ...(f.owner ? { owners: { some: { id: f.owner } } } : {}),
    ...(f.mine ? { owners: { some: { id: actor.id } } } : {}),
    ...(f.tag ? { tags: { some: { id: f.tag } } } : {}),
    ...(f.strength ? { relationshipStrength: { gte: f.strength } } : {}),
    ...(f.consent ? { consents: { some: { list: f.consent, optedIn: true } } } : {}),
    ...textSearchWhere(["nameEn", "nameTh", "email", "title"], f.q),
  };
}

export async function listContacts(actor: Actor, f: ContactFilter) {
  const where = contactWhere(actor, f);
  const [total, rows] = await Promise.all([
    db.contact.count({ where }),
    db.contact.findMany({
      where,
      orderBy: { nameEn: "asc" },
      ...pageArgs(f.page),
      select: {
        id: true,
        nameEn: true,
        nameTh: true,
        title: true,
        email: true,
        phone: true,
        relationshipStrength: true,
        organisation: { select: { id: true, nameEn: true } },
        owners: { select: { name: true } },
        tags: { select: { name: true } },
      },
    }),
  ]);
  return { total, rows };
}

export function getContact(id: string) {
  return db.contact.findUnique({
    where: { id },
    include: {
      organisation: { select: { id: true, nameEn: true, nameTh: true } },
      owners: { select: { id: true, name: true, title: true } },
      tags: { select: { id: true, name: true } },
      consents: { orderBy: { list: "asc" } },
      createdBy: { select: { name: true } },
    },
  });
}

export function listTagOptions() {
  return db.tag.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } });
}
