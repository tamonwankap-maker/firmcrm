import "server-only";
import type { AuditAction, Prisma } from "@/generated/prisma/client";
import { db, type Tx } from "./db";
import { computeDiff } from "./audit-diff";

export { computeDiff };

export interface AuditContext {
  userId: string | null;
  ip?: string | null;
}

export interface AuditEntry {
  action: AuditAction;
  entity: string;
  entityId?: string | null;
  before?: Record<string, unknown> | null;
  after?: Record<string, unknown> | null;
  /** Extra info for non-CRUD actions (e.g. export parameters). */
  meta?: Record<string, unknown>;
}

/** Write one audit row inside an existing transaction. */
export async function recordAudit(tx: Tx, ctx: AuditContext, entry: AuditEntry): Promise<void> {
  const diff = computeDiff(entry.before ?? null, entry.after ?? null);
  const payload: Record<string, unknown> = { ...diff };
  if (entry.meta) payload._meta = entry.meta;

  await tx.auditLog.create({
    data: {
      userId: ctx.userId,
      action: entry.action,
      entity: entry.entity,
      entityId: entry.entityId ?? null,
      diff: Object.keys(payload).length ? (payload as Prisma.InputJsonValue) : undefined,
      ip: ctx.ip ?? null,
    },
  });
}

/**
 * Run a mutation and its audit entries in ONE transaction.
 * The callback returns its result plus the audit entries to write.
 *
 *   const org = await withAudit(ctx, async (tx) => {
 *     const created = await tx.organisation.create({ data });
 *     return { result: created, audit: [{ action: "CREATE", entity: "Organisation", entityId: created.id, after: created }] };
 *   });
 */
export async function withAudit<T>(
  ctx: AuditContext,
  fn: (tx: Tx) => Promise<{ result: T; audit: AuditEntry[] }>,
  /** e.g. { timeout: 300_000 } for bulk imports */
  options?: { timeout?: number; maxWait?: number },
): Promise<T> {
  return db.$transaction(async (tx) => {
    const { result, audit } = await fn(tx);
    for (const entry of audit) await recordAudit(tx, ctx, entry);
    return result;
  }, options);
}
