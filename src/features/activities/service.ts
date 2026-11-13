import "server-only";
import { db } from "@/server/db";
import { withAudit, type AuditContext } from "@/server/audit";
import { assertCan, type Actor } from "@/server/auth/policy";
import { UserFacingError } from "@/server/actions/result";
import { opportunityVisibleWhere } from "@/server/auth/visibility";
import type { ActivityInput } from "./schema";

import { activityFacts } from "./facts";

export { activityFacts };

const include = {
  internalAttendees: { select: { id: true } },
  contacts: { select: { id: true } },
  practiceAreas: { select: { id: true } },
} as const;

function snap(a: {
  internalAttendees: { id: string }[];
  contacts: { id: string }[];
  practiceAreas: { id: string }[];
  [k: string]: unknown;
}) {
  const { internalAttendees, contacts, practiceAreas, ...rest } = a;
  return {
    ...rest,
    attendeeIds: internalAttendees.map((x) => x.id).sort(),
    contactIds: contacts.map((x) => x.id).sort(),
    practiceAreaIds: practiceAreas.map((x) => x.id).sort(),
  };
}

/**
 * Check the linked opportunity is visible to the actor (never trust client ids), and
 * fill the organisation from the opportunity or first contact when none was chosen.
 */
async function resolveLinks(actor: Actor, input: ActivityInput): Promise<string | null> {
  if (input.opportunityId) {
    const opp = await db.opportunity.findFirst({
      where: { AND: [{ id: input.opportunityId }, opportunityVisibleWhere(actor, { includeArchived: true })] },
      select: { organisationId: true },
    });
    if (!opp) throw new UserFacingError("Opportunity not found.", { opportunityId: ["Not found"] });
    if (!input.organisationId) return opp.organisationId;
  }
  if (input.organisationId) return input.organisationId;
  if (!input.contactIds.length) return null;
  const c = await db.contact.findFirst({ where: { id: { in: input.contactIds }, organisationId: { not: null } } });
  return c?.organisationId ?? null;
}

function scalarData(input: ActivityInput, organisationId: string | null, ownerId: string) {
  return {
    type: input.type,
    date: input.date,
    organisationId,
    opportunityId: input.opportunityId,
    summary: input.summary,
    nextAction: input.nextAction,
    nextActionDue: input.nextActionDue,
    ownerId,
    giftValue: input.type === "GIFT" ? input.giftValue : null,
    giftCurrency: input.type === "GIFT" && input.giftValue ? input.giftCurrency : null,
  };
}

export async function createActivity(actor: Actor, input: ActivityInput, ctx: AuditContext) {
  assertCan(actor, "create", "Activity");
  const organisationId = await resolveLinks(actor, input);
  const ownerId = input.ownerId ?? actor.id;
  const attendeeIds = input.attendeeIds.length ? input.attendeeIds : [ownerId];
  return withAudit(ctx, async (tx) => {
    const a = await tx.activity.create({
      data: {
        ...scalarData(input, organisationId, ownerId),
        internalAttendees: { connect: attendeeIds.map((id) => ({ id })) },
        contacts: { connect: input.contactIds.map((id) => ({ id })) },
        practiceAreas: { connect: input.practiceAreaIds.map((id) => ({ id })) },
      },
      include,
    });
    return { result: a, audit: [{ action: "CREATE", entity: "Activity", entityId: a.id, after: snap(a) }] };
  });
}

export async function updateActivity(actor: Actor, id: string, input: ActivityInput, ctx: AuditContext) {
  const organisationId = await resolveLinks(actor, input);
  return withAudit(ctx, async (tx) => {
    const before = await tx.activity.findUnique({ where: { id }, include });
    if (!before) throw new UserFacingError("Activity not found.");
    assertCan(actor, "update", "Activity", activityFacts(before));
    const ownerId = input.ownerId ?? before.ownerId;
    const after = await tx.activity.update({
      where: { id },
      data: {
        ...scalarData(input, organisationId, ownerId),
        // Re-opening a changed next action
        ...(input.nextAction !== before.nextAction ? { nextActionDone: false, nextActionDoneAt: null } : {}),
        internalAttendees: { set: (input.attendeeIds.length ? input.attendeeIds : [ownerId]).map((x) => ({ id: x })) },
        contacts: { set: input.contactIds.map((x) => ({ id: x })) },
        practiceAreas: { set: input.practiceAreaIds.map((x) => ({ id: x })) },
      },
      include,
    });
    return {
      result: after,
      audit: [{ action: "UPDATE", entity: "Activity", entityId: id, before: snap(before), after: snap(after) }],
    };
  });
}

export async function setNextActionDone(actor: Actor, id: string, done: boolean, ctx: AuditContext) {
  return withAudit(ctx, async (tx) => {
    const before = await tx.activity.findUnique({ where: { id }, include });
    if (!before) throw new UserFacingError("Activity not found.");
    assertCan(actor, "update", "Activity", activityFacts(before));
    const after = await tx.activity.update({
      where: { id },
      data: { nextActionDone: done, nextActionDoneAt: done ? new Date() : null },
    });
    return {
      result: after,
      audit: [
        {
          action: "UPDATE",
          entity: "Activity",
          entityId: id,
          before: { nextActionDone: before.nextActionDone },
          after: { nextActionDone: after.nextActionDone },
        },
      ],
    };
  });
}

export async function setActivityArchived(actor: Actor, id: string, archived: boolean, ctx: AuditContext) {
  return withAudit(ctx, async (tx) => {
    const before = await tx.activity.findUnique({ where: { id }, include });
    if (!before) throw new UserFacingError("Activity not found.");
    assertCan(actor, "archive", "Activity", activityFacts(before));
    await tx.activity.update({ where: { id }, data: { archivedAt: archived ? new Date() : null } });
    return { result: null, audit: [{ action: archived ? "ARCHIVE" : "RESTORE", entity: "Activity", entityId: id }] };
  });
}
