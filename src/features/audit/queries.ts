import "server-only";
import { z } from "zod";
import type { Prisma } from "@/generated/prisma/client";
import { db } from "@/server/db";
import { parseDateOnly } from "@/lib/dates";

export const AUDIT_ACTIONS = [
  "CREATE",
  "UPDATE",
  "DELETE",
  "ARCHIVE",
  "RESTORE",
  "LOGIN",
  "LOGIN_FAILED",
  "LOGOUT",
  "EXPORT",
  "PASSWORD_RESET",
] as const;

export const auditFilterSchema = z.object({
  page: z.coerce.number().int().min(1).catch(1),
  entity: z.string().max(60).optional().catch(undefined),
  action: z.enum(AUDIT_ACTIONS).optional().catch(undefined),
  userId: z.string().max(40).optional().catch(undefined),
  from: z.string().optional().catch(undefined),
  to: z.string().optional().catch(undefined),
});
export type AuditFilter = z.infer<typeof auditFilterSchema>;

export const AUDIT_PAGE_SIZE = 50;

export async function listAuditLog(filter: AuditFilter) {
  const from = filter.from ? parseDateOnly(filter.from) : null;
  const to = filter.to ? parseDateOnly(filter.to) : null;
  // Dates are entered as Bangkok calendar days: shift by +07:00.
  const BKK_OFFSET_MS = 7 * 3600_000;
  const where: Prisma.AuditLogWhereInput = {
    ...(filter.entity ? { entity: filter.entity } : {}),
    ...(filter.action ? { action: filter.action } : {}),
    ...(filter.userId ? { userId: filter.userId } : {}),
    ...(from || to
      ? {
          createdAt: {
            ...(from ? { gte: new Date(from.getTime() - BKK_OFFSET_MS) } : {}),
            ...(to ? { lt: new Date(to.getTime() + 86_400_000 - BKK_OFFSET_MS) } : {}),
          },
        }
      : {}),
  };
  const [total, rows] = await Promise.all([
    db.auditLog.count({ where }),
    db.auditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (filter.page - 1) * AUDIT_PAGE_SIZE,
      take: AUDIT_PAGE_SIZE,
      include: { user: { select: { name: true } } },
    }),
  ]);
  return { total, rows };
}

export async function auditFilterOptions() {
  const [entities, users] = await Promise.all([
    db.auditLog.findMany({ distinct: ["entity"], select: { entity: true }, orderBy: { entity: "asc" } }),
    db.user.findMany({ where: { canLogin: true }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
  ]);
  return { entities: entities.map((e) => e.entity), users };
}
