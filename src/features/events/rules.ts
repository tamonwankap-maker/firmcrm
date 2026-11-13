/**
 * Event rules (pure; unit-tested).
 */
import type { RsvpKey } from "../labels";

/** Contacts without an active EVENT_INVITES opt-in (never recorded, opted out, or withdrawn). */
export function contactsWithoutInviteConsent<
  C extends { id: string; nameEn: string; consents: { list: string; optedIn: boolean }[] },
>(contacts: C[]): C[] {
  return contacts.filter((c) => !c.consents.some((k) => k.list === "EVENT_INVITES" && k.optedIn));
}

export function consentWarning(names: string[]): string {
  const shown = names.slice(0, 8).join(", ");
  const more = names.length > 8 ? ` and ${names.length - 8} more` : "";
  return `${names.length === 1 ? "This contact has" : `${names.length} contacts have`} no event-invitation consent (PDPA): ${shown}${more}. Invite only if you have another lawful basis (e.g. a personal invitation from the relationship partner).`;
}

export interface InviteStatsInput {
  invited: boolean;
  rsvp: RsvpKey;
  attended: boolean | null;
  followUpOwnerId: string | null;
  followUpDone: boolean;
}

export function inviteStats(invites: InviteStatsInput[]) {
  const invited = invites.filter((i) => i.invited);
  return {
    listed: invites.length,
    invited: invited.length,
    yes: invites.filter((i) => i.rsvp === "YES").length,
    no: invites.filter((i) => i.rsvp === "NO").length,
    maybe: invites.filter((i) => i.rsvp === "MAYBE").length,
    noReply: invited.filter((i) => i.rsvp === "NO_REPLY").length,
    attended: invites.filter((i) => i.attended === true).length,
    followUpsOpen: invites.filter((i) => i.attended === true && !i.followUpDone).length,
    followUpsUnassigned: invites.filter((i) => i.attended === true && !i.followUpDone && !i.followUpOwnerId).length,
  };
}

/** Cost per attendee (null when no actual cost or nobody attended). */
export function costPerAttendee(actualCost: number | null, attended: number): number | null {
  if (actualCost == null || attended === 0) return null;
  return Math.round(actualCost / attended);
}
