import "server-only";
import { z } from "zod";
import type { Prisma } from "@/generated/prisma/client";
import { db } from "@/server/db";
import { textSearchWhere } from "@/server/text-search";
import { activityVisibleWhere, taskVisibleWhere } from "@/server/auth/visibility";
import type { Actor } from "@/server/auth/policy";
import { taskInclude } from "../tasks/queries";
import { listParamsSchema, pageArgs, zOptEnum, zOptFilterId } from "@/lib/list-params";
import { ORG_STATUSES, ORG_TYPES } from "../labels";

export const orgFilterSchema = listParamsSchema.extend({
  type: zOptEnum(ORG_TYPES),
  status: zOptEnum(ORG_STATUSES),
  partner: zOptFilterId,
  industry: zOptFilterId,
  key: z.enum(["1"]).optional().catch(undefined),
  mine: z.enum(["1"]).optional().catch(undefined),
});
export type OrgFilter = z.infer<typeof orgFilterSchema>;

export function orgWhere(actor: Actor, f: OrgFilter): Prisma.OrganisationWhereInput {
  return {
    archivedAt: f.archived ? { not: null } : null,
    ...(f.type ? { type: f.type } : {}),
    ...(f.status ? { status: f.status } : {}),
    ...(f.partner ? { relationshipPartnerId: f.partner } : {}),
    ...(f.mine ? { relationshipPartnerId: actor.id } : {}),
    ...(f.industry ? { industryId: f.industry } : {}),
    ...(f.key ? { isKeyClient: true } : {}),
    ...textSearchWhere(["nameEn", "nameTh"], f.q),
  };
}

export async function listOrganisations(actor: Actor, f: OrgFilter) {
  const where = orgWhere(actor, f);
  const [total, rows] = await Promise.all([
    db.organisation.count({ where }),
    db.organisation.findMany({
      where,
      orderBy: [{ isKeyClient: "desc" }, { nameEn: "asc" }],
      ...pageArgs(f.page),
      select: {
        id: true,
        nameEn: true,
        nameTh: true,
        type: true,
        status: true,
        country: true,
        isKeyClient: true,
        industry: { select: { name: true } },
        relationshipPartner: { select: { name: true } },
        _count: { select: { contacts: { where: { archivedAt: null } } } },
        activities: {
          where: activityVisibleWhere(actor),
          orderBy: { date: "desc" },
          take: 1,
          select: { date: true },
        },
      },
    }),
  ]);
  return { total, rows };
}

export async function getOrganisation(actor: Actor, id: string) {
  return db.organisation.findUnique({
    where: { id },
    include: {
      industry: { select: { id: true, name: true } },
      relationshipPartner: { select: { id: true, name: true } },
      createdBy: { select: { name: true } },
      contacts: {
        where: { archivedAt: null },
        orderBy: [{ relationshipStrength: "desc" }, { nameEn: "asc" }],
        select: {
          id: true,
          nameEn: true,
          nameTh: true,
          title: true,
          email: true,
          phone: true,
          relationshipStrength: true,
        },
      },
      tasks: {
        where: { ...taskVisibleWhere(actor), status: { in: ["OPEN", "IN_PROGRESS"] } },
        orderBy: { dueDate: "asc" },
        include: taskInclude,
      },
    },
  });
}

export function listIndustryOptions() {
  return db.industry.findMany({ where: { active: true }, orderBy: { name: "asc" }, select: { id: true, name: true } });
}

export function listPartnerOptions() {
  return db.user.findMany({
    where: { active: true, role: { in: ["PARTNER", "ADMIN"] } },
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });
}
