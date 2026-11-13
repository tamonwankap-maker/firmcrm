import "server-only";
import { z } from "zod";
import type { Prisma } from "@/generated/prisma/client";
import { db } from "@/server/db";
import { matterVisibleWhere } from "@/server/auth/visibility";
import type { Actor } from "@/server/auth/policy";
import { textSearchWhere } from "@/server/text-search";
import { listParamsSchema, pageArgs, zOptFilterId } from "@/lib/list-params";

export const matterInclude = {
  clientOrganisation: { select: { id: true, nameEn: true } },
  practiceAreas: { select: { id: true, name: true } },
  team: { select: { id: true, name: true } },
} satisfies Prisma.RepresentativeMatterInclude;
export type MatterRow = Prisma.RepresentativeMatterGetPayload<{ include: typeof matterInclude }>;

export const matterFilterSchema = listParamsSchema.extend({
  practice: zOptFilterId,
  year: z.coerce.number().int().min(1950).max(2100).optional().catch(undefined),
  publishable: z.enum(["1"]).optional().catch(undefined),
  org: zOptFilterId,
});
export type MatterFilter = z.infer<typeof matterFilterSchema>;

export async function listMatters(actor: Actor, f: MatterFilter) {
  const where: Prisma.RepresentativeMatterWhereInput = {
    AND: [
      matterVisibleWhere(actor, { includeArchived: f.archived }),
      f.archived ? { archivedAt: { not: null } } : {},
      f.practice ? { practiceAreas: { some: { id: f.practice } } } : {},
      f.year ? { year: f.year } : {},
      f.publishable ? { publishable: true } : {},
      f.org ? { clientOrganisationId: f.org } : {},
      f.q
        ? {
            OR: [
              textSearchWhere(["title", "description", "clientDisplayName"], f.q),
              { clientOrganisation: textSearchWhere(["nameEn", "nameTh"], f.q) },
            ],
          }
        : {},
    ],
  };
  const [total, rows] = await Promise.all([
    db.representativeMatter.count({ where }),
    db.representativeMatter.findMany({
      where,
      orderBy: [{ year: "desc" }, { title: "asc" }],
      ...pageArgs(f.page),
      include: matterInclude,
    }),
  ]);
  return { total, rows };
}

export function getMatter(actor: Actor, id: string) {
  return db.representativeMatter.findFirst({
    where: { AND: [{ id }, matterVisibleWhere(actor, { includeArchived: true })] },
    include: {
      ...matterInclude,
      submissions: {
        where: { archivedAt: null },
        select: {
          id: true,
          year: true,
          directory: { select: { name: true } },
          practiceArea: { select: { name: true } },
        },
        orderBy: { year: "desc" },
      },
    },
  });
}

export function mattersForOrganisation(actor: Actor, organisationId: string) {
  return db.representativeMatter.findMany({
    where: { AND: [{ clientOrganisationId: organisationId }, matterVisibleWhere(actor)] },
    orderBy: { year: "desc" },
    take: 50,
    include: matterInclude,
  });
}
