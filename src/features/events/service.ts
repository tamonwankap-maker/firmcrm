import "server-only";
import type { Prisma } from "@/generated/prisma/client";
import { withAudit, type AuditContext, type AuditEntry } from "@/server/audit";
import { assertCan, can, ForbiddenError, type Actor } from "@/server/auth/policy";
import { ConfirmRequiredError, UserFacingError } from "@/server/actions/result";
import type { Tx } from "@/server/db";
import { eventFacts } from "./facts";
import { consentWarning, contactsWithoutInviteConsent } from "./rules";
import type { EventInput, InviteUpdate } from "./schema";

const include = {
  speakers: { select: { id: true } },
  practiceAreas: { select: { id: true } },
} satisfies Prisma.EventInclude;
type Loaded = Prisma.EventGetPayload<{ include: typeof include }>;
const snap = (e: Loaded) => {
  const { speakers, practiceAreas, ...rest } = e;
  return {
    ...rest,
    speakerIds: speakers.map((s) => s.id).sort(),
    practiceAreaIds: practiceAreas.map((p) => p.id).sort(),
  };
};

async function loadEvent(tx: Tx, id: string): Promise<Loaded> {
  const e = await tx.event.findUnique({ where: { id }, include });
  if (!e) throw new UserFacingError("Event not found.");
  return e;
}

function scalars(input: EventInput, ownerId: string | null) {
  return {
    title: input.title,
    startsAt: input.startsAt,
    endsAt: input.endsAt,
    format: input.format,
    venue: input.format === "ONLINE" ? null : input.venue,
    onlineUrl: input.format === "IN_PERSON" ? null : input.onlineUrl,
    externalSpeakers: input.externalSpeakers,
    budget: input.budget,
    actualCost: input.actualCost,
    currency: input.currency,
    status: input.status,
    notes: input.notes,
    ownerId,
  };
}

export async function createEvent(actor: Actor, input: EventInput, ctx: AuditContext) {
  assertCan(actor, "create", "Event");
  return withAudit(ctx, async (tx) => {
    const e = await tx.event.create({
      data: {
        ...scalars(input, input.ownerId ?? actor.id),
        speakers: { connect: input.speakerIds.map((id) => ({ id })) },
        practiceAreas: { connect: input.practiceAreaIds.map((id) => ({ id })) },
      },
      include,
    });
    return { result: e, audit: [{ action: "CREATE", entity: "Event", entityId: e.id, after: snap(e) }] };
  });
}

export async function updateEvent(actor: Actor, id: string, input: EventInput, ctx: AuditContext) {
  return withAudit(ctx, async (tx) => {
    const before = await loadEvent(tx, id);
    assertCan(actor, "update", "Event", eventFacts(before));
    const after = await tx.event.update({
      where: { id },
      data: {
        ...scalars(input, input.ownerId ?? before.ownerId),
        speakers: { set: input.speakerIds.map((x) => ({ id: x })) },
        practiceAreas: { set: input.practiceAreaIds.map((x) => ({ id: x })) },
      },
      include,
    });
    return {
      result: after,
      audit: [{ action: "UPDATE", entity: "Event", entityId: id, before: snap(before), after: snap(after) }],
    };
  });
}

export async function setEventArchived(actor: Actor, id: string, archived: boolean, ctx: AuditContext) {
  return withAudit(ctx, async (tx) => {
    const before = await loadEvent(tx, id);
    assertCan(actor, "archive", "Event", eventFacts(before));
    await tx.event.update({ where: { id }, data: { archivedAt: archived ? new Date() : null } });
    return { result: null, audit: [{ action: archived ? "ARCHIVE" : "RESTORE", entity: "Event", entityId: id }] };
  });
}

// ── Invitations ───────────────────────────────────────────────────────────

/**
 * Add contacts to the invite list (explicit ids, everyone with a tag, or everyone at an organisation).
 * PDPA: contacts without an EVENT_INVITES opt-in trigger a confirmable warning, or are skipped with onlyConsented.
 */
export async function addInvites(
  actor: Actor,
  eventId: string,
  input: { contactIds: string[]; tagId?: string; organisationId?: string; onlyConsented?: boolean; confirm?: boolean },
  ctx: AuditContext,
) {
  return withAudit(
    ctx,
    async (tx) => {
      const event = await loadEvent(tx, eventId);
      assertCan(actor, "update", "Event", eventFacts(event));
      const or: Prisma.ContactWhereInput[] = [];
      if (input.contactIds.length) or.push({ id: { in: input.contactIds } });
      if (input.tagId) or.push({ tags: { some: { id: input.tagId } } });
      if (input.organisationId) or.push({ organisationId: input.organisationId });
      if (!or.length) throw new UserFacingError("Choose contacts, a tag or an organisation to invite.");

      const candidates = await tx.contact.findMany({
        where: { archivedAt: null, OR: or, eventInvites: { none: { eventId } } },
        select: { id: true, nameEn: true, consents: { select: { list: true, optedIn: true } } },
        take: 2000,
      });
      const noConsent = contactsWithoutInviteConsent(candidates);
      let toAdd = candidates;
      if (input.onlyConsented) {
        const skip = new Set(noConsent.map((c) => c.id));
        toAdd = candidates.filter((c) => !skip.has(c.id));
      } else if (noConsent.length && !input.confirm) {
        throw new ConfirmRequiredError([consentWarning(noConsent.map((c) => c.nameEn))]);
      }
      if (!toAdd.length) {
        throw new UserFacingError(
          candidates.length
            ? "No contacts with event-invitation consent to add."
            : "Everyone selected is already on the list.",
        );
      }
      await tx.eventInvite.createMany({ data: toAdd.map((c) => ({ eventId, contactId: c.id })) });
      const audit: AuditEntry[] = [
        {
          action: "CREATE",
          entity: "EventInvite",
          entityId: eventId,
          meta: {
            added: toAdd.length,
            contactIds: toAdd.map((c) => c.id),
            withoutConsent: input.onlyConsented ? 0 : noConsent.length,
            skippedWithoutConsent: input.onlyConsented ? noConsent.length : 0,
          },
        },
      ];
      return { result: { added: toAdd.length, skipped: input.onlyConsented ? noConsent.length : 0 }, audit };
    },
    { timeout: 60_000 },
  );
}

/**
 * Event members (BD, owner, speakers) may change anything on an invite. The assigned follow-up
 * owner may only tick their follow-up as done.
 */
async function loadInviteForUpdate(tx: Tx, actor: Actor, inviteId: string, patch: InviteUpdate) {
  const inv = await tx.eventInvite.findUnique({ where: { id: inviteId } });
  if (!inv) throw new UserFacingError("Invitation not found.");
  const event = await loadEvent(tx, inv.eventId);
  if (can(actor, "update", "Event", eventFacts(event))) return inv;
  const onlyFollowUp = Object.keys(patch).every((k) => k === "followUpDone");
  if (onlyFollowUp && inv.followUpOwnerId === actor.id && actor.role !== "VIEWER") return inv;
  throw new ForbiddenError();
}

export async function updateInvite(actor: Actor, inviteId: string, patch: InviteUpdate, ctx: AuditContext) {
  return withAudit(ctx, async (tx) => {
    const before = await loadInviteForUpdate(tx, actor, inviteId, patch);
    const data: Prisma.EventInviteUncheckedUpdateInput = {};
    if (patch.invited !== undefined) {
      data.invited = patch.invited;
      data.invitedAt = patch.invited ? (before.invitedAt ?? new Date()) : null;
    }
    if (patch.rsvp !== undefined) {
      data.rsvp = patch.rsvp;
      if (patch.rsvp !== "NO_REPLY" && !before.invited) {
        data.invited = true;
        data.invitedAt = before.invitedAt ?? new Date();
      }
    }
    if (patch.attended !== undefined) data.attended = patch.attended;
    if (patch.followUpOwnerId !== undefined) data.followUpOwnerId = patch.followUpOwnerId;
    if (patch.followUpDone !== undefined) data.followUpDone = patch.followUpDone;
    const after = await tx.eventInvite.update({ where: { id: inviteId }, data });
    return { result: after, audit: [{ action: "UPDATE", entity: "EventInvite", entityId: inviteId, before, after }] };
  });
}

export async function removeInvite(actor: Actor, inviteId: string, ctx: AuditContext) {
  return withAudit(ctx, async (tx) => {
    const inv = await tx.eventInvite.findUnique({ where: { id: inviteId } });
    if (!inv) throw new UserFacingError("Invitation not found.");
    const event = await loadEvent(tx, inv.eventId);
    assertCan(actor, "update", "Event", eventFacts(event));
    await tx.eventInvite.delete({ where: { id: inviteId } });
    return {
      result: inv.eventId,
      audit: [{ action: "DELETE", entity: "EventInvite", entityId: inviteId, before: inv }],
    };
  });
}
