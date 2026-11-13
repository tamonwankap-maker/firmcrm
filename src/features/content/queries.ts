import "server-only";
import { z } from "zod";
import type { Prisma } from "@/generated/prisma/client";
import { db } from "@/server/db";
import type { Actor } from "@/server/auth/policy";
import { listParamsSchema, pageArgs, zOptEnum, zOptFilterId } from "@/lib/list-params";
import { CONTENT_STATUSES, CONTENT_TYPES } from "../labels";

export const contentInclude = {
  authors: { select: { id: true, name: true } },
  practiceAreas: { select: { id: true, name: true } },
} satisfies Prisma.ContentInclude;

export const contentFilterSchema = listParamsSchema.extend({
  status: zOptEnum(CONTENT_STATUSES),
  type: zOptEnum(CONTENT_TYPES),
  practice: zOptFilterId,
  mine: z.enum(["1"]).optional().catch(undefined),
});

export async function listContent(actor: Actor, f: z.infer<typeof contentFilterSchema>) {
  const where: Prisma.ContentWhereInput = {
    archivedAt: f.archived ? { not: null } : null,
    ...(f.status ? { status: f.status } : {}),
    ...(f.type ? { type: f.type } : {}),
    ...(f.practice ? { practiceAreas: { some: { id: f.practice } } } : {}),
    ...(f.mine ? { authors: { some: { id: actor.id } } } : {}),
    ...(f.q ? { title: { contains: f.q, mode: "insensitive" } } : {}),
  };
  const [total, rows, counts] = await Promise.all([
    db.content.count({ where }),
    db.content.findMany({
      where,
      orderBy: [{ publishDate: { sort: "desc", nulls: "first" } }, { updatedAt: "desc" }],
      ...pageArgs(f.page, 50),
      include: contentInclude,
    }),
    db.content.groupBy({ by: ["status"], where: { archivedAt: null }, _count: true }),
  ]);
  return { total, rows, counts: Object.fromEntries(counts.map((c) => [c.status, c._count])) as Record<string, number> };
}

export function getContent(id: string) {
  return db.content.findUnique({ where: { id }, include: contentInclude });
}
