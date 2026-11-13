"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requestIp, requireUser } from "@/server/auth/current-user";
import { assertCan } from "@/server/auth/policy";
import { withAudit } from "@/server/audit";
import type { Tx } from "@/server/db";
import { runAction, type ActionResult } from "@/server/actions/result";
import { normalizeText } from "@/lib/thai";
import { LOOKUP_KINDS, LOOKUP_LABELS, lookupInputSchema, type LookupKind } from "./schema";

type Row = { id: string; name: string; active: boolean };

/** Small adapter so the three lookup tables share one code path (no dynamic model access). */
function repo(tx: Tx, kind: LookupKind) {
  switch (kind) {
    case "practiceArea":
      return {
        find: (id: string): Promise<Row> => tx.practiceArea.findUniqueOrThrow({ where: { id } }),
        create: async (name: string): Promise<Row> => {
          const max = await tx.practiceArea.aggregate({ _max: { sortOrder: true } });
          return tx.practiceArea.create({ data: { name, sortOrder: (max._max.sortOrder ?? 0) + 1 } });
        },
        update: (id: string, data: Partial<Row>): Promise<Row> => tx.practiceArea.update({ where: { id }, data }),
      };
    case "industry":
      return {
        find: (id: string): Promise<Row> => tx.industry.findUniqueOrThrow({ where: { id } }),
        create: (name: string): Promise<Row> => tx.industry.create({ data: { name } }),
        update: (id: string, data: Partial<Row>): Promise<Row> => tx.industry.update({ where: { id }, data }),
      };
    case "directory":
      return {
        find: (id: string): Promise<Row> => tx.directory.findUniqueOrThrow({ where: { id } }),
        create: (name: string): Promise<Row> => tx.directory.create({ data: { name } }),
        update: (id: string, data: Partial<Row>): Promise<Row> => tx.directory.update({ where: { id }, data }),
      };
  }
}

export async function addLookupAction(_prev: ActionResult | null, form: FormData): Promise<ActionResult> {
  return runAction(async () => {
    const me = await requireUser();
    assertCan(me, "create", "LookupList");
    const { kind, name } = lookupInputSchema.parse(Object.fromEntries(form));
    await withAudit({ userId: me.id, ip: await requestIp() }, async (tx) => {
      const row = await repo(tx, kind).create(normalizeText(name));
      return {
        result: row,
        audit: [{ action: "CREATE", entity: LOOKUP_LABELS[kind].entity, entityId: row.id, after: row }],
      };
    });
    revalidatePath("/admin/lists");
    return { ok: true, message: `Added “${name}”.` };
  });
}

const renameSchema = lookupInputSchema.extend({ id: z.string().min(1) });

export async function renameLookupAction(_prev: ActionResult | null, form: FormData): Promise<ActionResult> {
  return runAction(async () => {
    const me = await requireUser();
    assertCan(me, "update", "LookupList");
    const { kind, id, name } = renameSchema.parse(Object.fromEntries(form));
    await withAudit({ userId: me.id, ip: await requestIp() }, async (tx) => {
      const r = repo(tx, kind);
      const before = await r.find(id);
      const after = await r.update(id, { name: normalizeText(name) });
      return {
        result: after,
        audit: [{ action: "UPDATE", entity: LOOKUP_LABELS[kind].entity, entityId: id, before, after }],
      };
    });
    revalidatePath("/admin/lists");
    return { ok: true };
  });
}

const toggleSchema = z.object({ kind: z.enum(LOOKUP_KINDS), id: z.string().min(1) });

/** Lookups are deactivated, never deleted, so historical records keep their labels. */
export async function toggleLookupAction(form: FormData): Promise<void> {
  const me = await requireUser();
  assertCan(me, "update", "LookupList");
  const { kind, id } = toggleSchema.parse(Object.fromEntries(form));
  await withAudit({ userId: me.id, ip: await requestIp() }, async (tx) => {
    const r = repo(tx, kind);
    const before = await r.find(id);
    const after = await r.update(id, { active: !before.active });
    return {
      result: after,
      audit: [{ action: "UPDATE", entity: LOOKUP_LABELS[kind].entity, entityId: id, before, after }],
    };
  });
  revalidatePath("/admin/lists");
}
