import "server-only";
import { z } from "zod";
import type { Prisma } from "@/generated/prisma/client";
import { db } from "@/server/db";
import { listParamsSchema, pageArgs, zOptEnum } from "@/lib/list-params";
import { AWARD_STATUSES } from "../labels";

export const awardInclude = {
  owner: { select: { id: true, name: true } },
  practiceAreas: { select: { id: true, name: true } },
} satisfies Prisma.AwardInclude;

export const awardFilterSchema = listParamsSchema.extend({
  year: z.coerce.number().int().min(2000).max(2100).optional().catch(undefined),
  status: zOptEnum(AWARD_STATUSES),
});

export async function listAwards(f: z.infer<typeof awardFilterSchema>) {
  const where: Prisma.AwardWhereInput = {
    archivedAt: f.archived ? { not: null } : null,
    ...(f.year ? { year: f.year } : {}),
    ...(f.status ? { status: f.status } : {}),
    ...(f.q
      ? { OR: [{ name: { contains: f.q, mode: "insensitive" } }, { category: { contains: f.q, mode: "insensitive" } }] }
      : {}),
  };
  const [total, rows] = await Promise.all([
    db.award.count({ where }),
    db.award.findMany({
      where,
      orderBy: [{ year: "desc" }, { deadline: { sort: "asc", nulls: "last" } }],
      ...pageArgs(f.page, 50),
      include: awardInclude,
    }),
  ]);
  return { total, rows };
}

export function getAward(id: string) {
  return db.award.findUnique({ where: { id }, include: awardInclude });
}
