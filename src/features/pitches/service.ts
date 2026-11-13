import "server-only";
import type { Prisma } from "@/generated/prisma/client";
import { withAudit, type AuditContext } from "@/server/audit";
import { assertCan, type Actor } from "@/server/auth/policy";
import { pitchVisibleWhere } from "@/server/auth/visibility";
import { UserFacingError } from "@/server/actions/result";
import type { Tx } from "@/server/db";
import { STANDARD_PITCH_CHECKLIST } from "../labels";
import { loadVisibleOpportunity } from "../opportunities/service";
import { opportunityFacts } from "../opportunities/facts";
import { pitchFacts } from "./facts";
import type { PitchInput } from "./schema";

const include = {
  opportunity: { select: { id: true, leadPartnerId: true, confidential: true, team: { select: { id: true } } } },
  checklist: true,
} satisfies Prisma.PitchInclude;

async function loadPitch(tx: Tx, actor: Actor, id: string) {
  const p = await tx.pitch.findFirst({ where: { AND: [{ id }, pitchVisibleWhere(actor)] }, include });
  if (!p) throw new UserFacingError("Pitch not found.");
  return p;
}

const snap = (p: Prisma.PitchGetPayload<{ include: typeof include }>) => {
  const { opportunity: _o, checklist, ...rest } = p;
  return { ...rest, checklist: checklist.map((c) => `${c.done ? "[x]" : "[ ]"} ${c.label}`) };
};

export async function createPitch(actor: Actor, input: PitchInput, ctx: AuditContext) {
  return withAudit(ctx, async (tx) => {
    const opp = await loadVisibleOpportunity(tx, actor, input.opportunityId);
    // Creating a pitch is work on the opportunity: same rights as editing it.
    assertCan(actor, "update", "Opportunity", opportunityFacts(opp));
    assertCan(actor, "create", "Pitch");
    const p = await tx.pitch.create({
      data: {
        opportunityId: opp.id,
        deadline: input.deadline,
        ownerId: input.ownerId ?? actor.id,
        format: input.format,
        status: input.status,
        notes: input.notes,
        checklist: { create: STANDARD_PITCH_CHECKLIST.map((label, i) => ({ label, isStandard: true, sortOrder: i })) },
      },
      include,
    });
    return { result: p, audit: [{ action: "CREATE", entity: "Pitch", entityId: p.id, after: snap(p) }] };
  });
}

export async function updatePitch(
  actor: Actor,
  id: string,
  input: Omit<PitchInput, "opportunityId">,
  ctx: AuditContext,
) {
  return withAudit(ctx, async (tx) => {
    const before = await loadPitch(tx, actor, id);
    assertCan(actor, "update", "Pitch", pitchFacts(before));
    const after = await tx.pitch.update({
      where: { id },
      data: {
        deadline: input.deadline,
        ownerId: input.ownerId ?? before.ownerId,
        format: input.format,
        status: input.status,
        notes: input.notes,
      },
      include,
    });
    return {
      result: after,
      audit: [{ action: "UPDATE", entity: "Pitch", entityId: id, before: snap(before), after: snap(after) }],
    };
  });
}

async function mutateChecklist(
  actor: Actor,
  pitchId: string,
  ctx: AuditContext,
  fn: (tx: Tx, pitch: Prisma.PitchGetPayload<{ include: typeof include }>) => Promise<void>,
) {
  return withAudit(ctx, async (tx) => {
    const before = await loadPitch(tx, actor, pitchId);
    assertCan(actor, "update", "Pitch", pitchFacts(before));
    await fn(tx, before);
    const after = await tx.pitch.findUniqueOrThrow({ where: { id: pitchId }, include });
    return {
      result: after,
      audit: [{ action: "UPDATE", entity: "Pitch", entityId: pitchId, before: snap(before), after: snap(after) }],
    };
  });
}

export function toggleChecklistItem(actor: Actor, pitchId: string, itemId: string, done: boolean, ctx: AuditContext) {
  return mutateChecklist(actor, pitchId, ctx, async (tx, pitch) => {
    if (!pitch.checklist.some((c) => c.id === itemId)) throw new UserFacingError("Checklist item not found.");
    await tx.pitchChecklistItem.update({ where: { id: itemId }, data: { done, doneAt: done ? new Date() : null } });
  });
}

export function addChecklistItem(actor: Actor, pitchId: string, label: string, ctx: AuditContext) {
  return mutateChecklist(actor, pitchId, ctx, async (tx, pitch) => {
    if (pitch.checklist.length >= 30) throw new UserFacingError("A checklist can have at most 30 items.");
    const max = Math.max(-1, ...pitch.checklist.map((c) => c.sortOrder));
    await tx.pitchChecklistItem.create({ data: { pitchId, label, sortOrder: max + 1 } });
  });
}

export function removeChecklistItem(actor: Actor, pitchId: string, itemId: string, ctx: AuditContext) {
  return mutateChecklist(actor, pitchId, ctx, async (tx, pitch) => {
    const item = pitch.checklist.find((c) => c.id === itemId);
    if (!item) throw new UserFacingError("Checklist item not found.");
    if (item.isStandard) throw new UserFacingError("Standard checklist items cannot be removed.");
    await tx.pitchChecklistItem.delete({ where: { id: itemId } });
  });
}

export async function setPitchArchived(actor: Actor, id: string, archived: boolean, ctx: AuditContext) {
  return withAudit(ctx, async (tx) => {
    const before = await tx.pitch.findFirst({ where: { AND: [{ id }, pitchVisibleWhere(actor)] }, include });
    // pitchVisibleWhere hides archived pitches; allow restoring by checking the opportunity instead.
    const p = before ?? (await tx.pitch.findUnique({ where: { id }, include }));
    if (!p) throw new UserFacingError("Pitch not found.");
    await loadVisibleOpportunity(tx, actor, p.opportunityId);
    assertCan(actor, "archive", "Pitch", pitchFacts(p));
    await tx.pitch.update({ where: { id }, data: { archivedAt: archived ? new Date() : null } });
    return { result: null, audit: [{ action: archived ? "ARCHIVE" : "RESTORE", entity: "Pitch", entityId: id }] };
  });
}
