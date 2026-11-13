import "server-only";
import { db } from "@/server/db";
import { todayInBangkok } from "@/lib/dates";
import type { CurrentUser } from "@/server/auth/current-user";
import type { ActivityFormValues } from "./components/activity-form";
import type { ActivityWithRelations } from "./queries";

const ymd = (d: Date | null | undefined) => (d ? d.toISOString().slice(0, 10) : "");

/** Defaults for a new activity, pre-filled from ?org= / ?contact=. */
export async function newActivityDefaults(
  me: CurrentUser,
  orgId?: string,
  contactId?: string,
  opportunity?: { id: string; name: string; organisation: { id: string; nameEn: string } } | null,
): Promise<ActivityFormValues> {
  const contact = contactId
    ? await db.contact.findUnique({
        where: { id: contactId },
        select: { id: true, nameEn: true, organisation: { select: { id: true, nameEn: true } } },
      })
    : null;
  const org = opportunity
    ? opportunity.organisation
    : orgId
      ? await db.organisation.findUnique({ where: { id: orgId }, select: { id: true, nameEn: true } })
      : (contact?.organisation ?? null);
  return {
    type: "",
    date: ymd(todayInBangkok()),
    organisation: org ? { id: org.id, label: org.nameEn } : null,
    opportunity: opportunity ? { id: opportunity.id, label: opportunity.name } : null,
    contacts: contact ? [{ id: contact.id, label: contact.nameEn }] : [],
    attendees: [{ id: me.id, label: me.name }],
    practiceAreaIds: [],
    summary: "",
    nextAction: "",
    nextActionDue: "",
    owner: { id: me.id, label: me.name },
    giftValue: "",
    giftCurrency: "THB",
  };
}

export function activityToFormValues(a: ActivityWithRelations): ActivityFormValues {
  return {
    type: a.type,
    date: ymd(a.date),
    organisation: a.organisation ? { id: a.organisation.id, label: a.organisation.nameEn } : null,
    opportunity: a.opportunity ? { id: a.opportunity.id, label: a.opportunity.name } : null,
    contacts: a.contacts.map((c) => ({ id: c.id, label: c.nameEn })),
    attendees: a.internalAttendees.map((u) => ({ id: u.id, label: u.name })),
    practiceAreaIds: a.practiceAreas.map((p) => p.id),
    summary: a.summary,
    nextAction: a.nextAction ?? "",
    nextActionDue: ymd(a.nextActionDue),
    owner: { id: a.owner.id, label: a.owner.name },
    giftValue: a.giftValue?.toString() ?? "",
    giftCurrency: a.giftCurrency ?? "THB",
  };
}
