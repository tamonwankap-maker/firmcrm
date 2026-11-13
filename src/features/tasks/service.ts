import "server-only";
import { withAudit, type AuditContext } from "@/server/audit";
import { assertCan, type Actor, type ResourceFacts } from "@/server/auth/policy";
import { UserFacingError } from "@/server/actions/result";
import type { TaskStatusKey } from "../labels";
import { db } from "@/server/db";
import { opportunityVisibleWhere, pitchVisibleWhere } from "@/server/auth/visibility";
import type { TaskInput } from "./schema";

export function taskFacts(t: { ownerId: string }): ResourceFacts {
  return { memberIds: [t.ownerId] };
}

/** Linked opportunity/pitch must be visible to the actor (confidentiality). */
async function assertLinksVisible(actor: Actor, input: TaskInput) {
  if (input.opportunityId) {
    const ok = await db.opportunity.count({
      where: { AND: [{ id: input.opportunityId }, opportunityVisibleWhere(actor)] },
    });
    if (!ok) throw new UserFacingError("Opportunity not found.");
  }
  if (input.pitchId) {
    const ok = await db.pitch.count({ where: { AND: [{ id: input.pitchId }, pitchVisibleWhere(actor)] } });
    if (!ok) throw new UserFacingError("Pitch not found.");
  }
}

function linkData(input: TaskInput) {
  return {
    organisationId: input.organisationId,
    contactId: input.contactId,
    opportunityId: input.opportunityId,
    pitchId: input.pitchId,
  };
}

export async function createTask(actor: Actor, input: TaskInput, ctx: AuditContext) {
  assertCan(actor, "create", "Task");
  await assertLinksVisible(actor, input);
  return withAudit(ctx, async (tx) => {
    const t = await tx.task.create({
      data: {
        title: input.title,
        dueDate: input.dueDate,
        ownerId: input.ownerId ?? actor.id,
        status: input.status,
        notes: input.notes,
        ...linkData(input),
      },
    });
    return { result: t, audit: [{ action: "CREATE", entity: "Task", entityId: t.id, after: t }] };
  });
}

export async function updateTask(actor: Actor, id: string, input: TaskInput, ctx: AuditContext) {
  await assertLinksVisible(actor, input);
  return withAudit(ctx, async (tx) => {
    const before = await tx.task.findUnique({ where: { id } });
    if (!before) throw new UserFacingError("Task not found.");
    assertCan(actor, "update", "Task", taskFacts(before));
    const after = await tx.task.update({
      where: { id },
      data: {
        title: input.title,
        dueDate: input.dueDate,
        ownerId: input.ownerId ?? before.ownerId,
        status: input.status,
        notes: input.notes,
        ...linkData(input),
      },
    });
    return { result: after, audit: [{ action: "UPDATE", entity: "Task", entityId: id, before, after }] };
  });
}

export async function setTaskStatus(actor: Actor, id: string, status: TaskStatusKey, ctx: AuditContext) {
  return withAudit(ctx, async (tx) => {
    const before = await tx.task.findUnique({ where: { id } });
    if (!before) throw new UserFacingError("Task not found.");
    assertCan(actor, "update", "Task", taskFacts(before));
    const after = await tx.task.update({ where: { id }, data: { status } });
    return {
      result: after,
      audit: [{ action: "UPDATE", entity: "Task", entityId: id, before: { status: before.status }, after: { status } }],
    };
  });
}
