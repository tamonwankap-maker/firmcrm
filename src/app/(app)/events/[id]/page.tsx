import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CalendarDays, MapPin, Video } from "lucide-react";
import { requireUser } from "@/server/auth/current-user";
import { can } from "@/server/auth/policy";
import { getEvent } from "@/features/events/queries";
import { eventFacts } from "@/features/events/facts";
import { costPerAttendee, inviteStats } from "@/features/events/rules";
import { setEventArchivedAction, updateEventAction } from "@/features/events/actions";
import { EventForm } from "@/features/events/components/event-form";
import { AddInvitesForm, InviteList } from "@/features/events/components/invite-list";
import { eventToFormValues } from "@/features/events/defaults";
import { listTagOptions } from "@/features/contacts/queries";
import { practiceAreaOptions } from "@/features/lookups/options";
import { TaskList } from "@/features/tasks/components/task-list";
import { toTaskRows } from "@/features/tasks/to-rows";
import { EVENT_FORMAT_LABELS, EVENT_STATUS_LABELS } from "@/features/labels";
import { ArchiveButton } from "@/components/records/archive-button";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDateTime } from "@/lib/dates";
import { formatMoney } from "@/lib/money";

export const metadata: Metadata = { title: "Event" };

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="bg-card rounded-md border px-3 py-2">
      <div className="text-muted-foreground text-[11px] font-medium tracking-wide uppercase">{label}</div>
      <div className="text-lg font-semibold tabular-nums">{value}</div>
    </div>
  );
}

export default async function EventPage(props: PageProps<"/events/[id]">) {
  const me = await requireUser();
  const { id } = await props.params;
  const e = await getEvent(me, id);
  if (!e) notFound();
  const canEdit = can(me, "update", "Event", eventFacts(e));
  const [tags, practiceAreas] = canEdit ? await Promise.all([listTagOptions(), practiceAreaOptions()]) : [[], []];
  const s = inviteStats(e.invites);
  const actual = e.actualCost ? Number(e.actualCost.toString()) : null;
  const cpa = costPerAttendee(actual, s.attended);
  const noConsentCount = e.invites.filter((i) => !i.contact.consents.some((c) => c.optedIn)).length;

  return (
    <div className="flex flex-col gap-6">
      {e.archivedAt && <Alert variant="warning">This event is archived.</Alert>}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{e.title}</h1>
          <div className="text-muted-foreground mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm">
            <span className="inline-flex items-center gap-1">
              <CalendarDays className="size-4" /> {formatDateTime(e.startsAt)}
              {e.endsAt && ` – ${formatDateTime(e.endsAt)}`}
            </span>
            {e.venue && (
              <span className="inline-flex items-center gap-1">
                <MapPin className="size-4" /> {e.venue}
              </span>
            )}
            {e.onlineUrl && (
              <a
                href={e.onlineUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary inline-flex items-center gap-1 hover:underline"
              >
                <Video className="size-4" /> Online link
              </a>
            )}
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            <Badge variant="secondary">{EVENT_STATUS_LABELS[e.status]}</Badge>
            <Badge variant="outline">{EVENT_FORMAT_LABELS[e.format]}</Badge>
          </div>
        </div>
        {canEdit && (
          <ArchiveButton archived={!!e.archivedAt} action={setEventArchivedAction.bind(null, e.id)} label="event" />
        )}
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-8">
        <Stat label="On list" value={s.listed} />
        <Stat label="Invited" value={s.invited} />
        <Stat label="Yes" value={s.yes} />
        <Stat label="Maybe" value={s.maybe} />
        <Stat label="No reply" value={s.noReply} />
        <Stat label="Attended" value={s.attended} />
        <Stat label="Follow-ups open" value={s.followUpsOpen} />
        <Stat label="Cost / attendee" value={cpa == null ? "—" : formatMoney(cpa, e.currency)} />
      </div>
      {s.followUpsUnassigned > 0 && (
        <Alert variant="warning">{s.followUpsUnassigned} attendee(s) have no follow-up owner yet.</Alert>
      )}
      {noConsentCount > 0 && (
        <Alert variant="warning">
          {noConsentCount} guest(s) on the list have no event-invitation consent (marked with a shield). Make sure there
          is another lawful basis before inviting them.
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Invite list</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {canEdit && <AddInvitesForm eventId={e.id} tags={tags} />}
          <InviteList
            canEdit={canEdit}
            currentUserId={me.id}
            rows={e.invites.map((i) => ({
              id: i.id,
              contact: {
                id: i.contact.id,
                name: i.contact.nameTh ? `${i.contact.nameEn} (${i.contact.nameTh})` : i.contact.nameEn,
                sub: [i.contact.title, i.contact.organisation?.nameEn].filter(Boolean).join(" · "),
                hasConsent: i.contact.consents.some((c) => c.optedIn),
              },
              invited: i.invited,
              rsvp: i.rsvp,
              attended: i.attended,
              followUpOwner: i.followUpOwner ? { id: i.followUpOwner.id, label: i.followUpOwner.name } : null,
              followUpDone: i.followUpDone,
            }))}
          />
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>{canEdit ? "Edit event" : "Details"}</CardTitle>
          </CardHeader>
          <CardContent>
            {canEdit ? (
              <EventForm
                action={updateEventAction.bind(null, e.id)}
                defaults={eventToFormValues(e)}
                practiceAreas={practiceAreas}
                submitLabel="Save event"
              />
            ) : (
              <dl className="grid grid-cols-[8rem_1fr] gap-2 text-sm">
                <dt className="text-muted-foreground">Speakers</dt>
                <dd>{[...e.speakers.map((p) => p.name), e.externalSpeakers].filter(Boolean).join(", ") || "—"}</dd>
                <dt className="text-muted-foreground">Budget</dt>
                <dd>{formatMoney(e.budget, e.currency) || "—"}</dd>
                <dt className="text-muted-foreground">Notes</dt>
                <dd className="whitespace-pre-line">{e.notes || "—"}</dd>
              </dl>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Budget</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-1 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Budget</span>
              <span className="tabular-nums">{formatMoney(e.budget, e.currency) || "—"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Actual</span>
              <span className="tabular-nums">{formatMoney(e.actualCost, e.currency) || "—"}</span>
            </div>
            {e.budget && e.actualCost && (
              <div className="flex justify-between font-medium">
                <span>Variance</span>
                <span className="tabular-nums">
                  {formatMoney(Number(e.budget.toString()) - Number(e.actualCost.toString()), e.currency)}
                </span>
              </div>
            )}
            {e.tasks.length > 0 && (
              <div className="mt-4">
                <p className="mb-1 font-medium">Open tasks</p>
                <TaskList tasks={toTaskRows(me, e.tasks)} showLink={false} />
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
