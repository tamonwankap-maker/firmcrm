import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ExternalLink, Mail, Pencil, Phone, Plus } from "lucide-react";
import { requireUser } from "@/server/auth/current-user";
import { can } from "@/server/auth/policy";
import { db } from "@/server/db";
import { getContact } from "@/features/contacts/queries";
import { contactFacts } from "@/features/contacts/facts";
import { setContactArchivedAction } from "@/features/contacts/actions";
import { activitiesFor } from "@/features/activities/queries";
import { ActivityTimeline } from "@/features/activities/components/activity-timeline";
import { tasksFor } from "@/features/tasks/queries";
import { toTaskRows } from "@/features/tasks/to-rows";
import { TaskList } from "@/features/tasks/components/task-list";
import { QuickTaskForm } from "@/features/tasks/components/quick-task-form";
import { refereeHistory } from "@/features/rankings/queries";
import { eventHistory } from "@/features/events/queries";
import { RSVP_LABELS } from "@/features/labels";
import { ConsentPanel } from "@/features/consents/components/consent-panel";
import { LANGUAGE_LABELS, STRENGTH_LABELS } from "@/features/labels";
import { ArchiveButton } from "@/components/records/archive-button";
import { DetailList } from "@/components/records/detail-list";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDate, formatDateTime, todayInBangkok } from "@/lib/dates";

export async function generateMetadata(props: PageProps<"/contacts/[id]">): Promise<Metadata> {
  const { id } = await props.params;
  const c = await db.contact.findUnique({ where: { id }, select: { nameEn: true } });
  return { title: c?.nameEn ?? "Contact" };
}

export default async function ContactPage(props: PageProps<"/contacts/[id]">) {
  const me = await requireUser();
  const { id } = await props.params;
  const c = await getContact(id);
  if (!c) notFound();
  const canEdit = can(me, "update", "Contact", contactFacts(c));
  const [activities, tasks, referee, events] = await Promise.all([
    activitiesFor(me, { contactId: c.id }),
    tasksFor(me, { contactId: c.id }),
    refereeHistory(c.id),
    eventHistory(c.id),
  ]);
  const here = `/contacts/${c.id}`;

  return (
    <div className="flex flex-col gap-6">
      {c.archivedAt && <Alert variant="warning">This contact is archived.</Alert>}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{c.nameEn}</h1>
          {c.nameTh && (
            <p className="text-muted-foreground text-lg" lang="th">
              {c.nameTh}
            </p>
          )}
          <p className="mt-1 text-sm">
            {c.title}
            {c.title && c.organisation && " · "}
            {c.organisation && (
              <Link href={`/organisations/${c.organisation.id}`} className="text-primary hover:underline">
                {c.organisation.nameEn}
              </Link>
            )}
          </p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {c.tags.map((t) => (
              <Badge key={t.id} variant="outline">
                {t.name}
              </Badge>
            ))}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {can(me, "create", "Activity") && (
            <Button asChild>
              <Link href={`/activities/new?contact=${c.id}&returnTo=${encodeURIComponent(here)}`}>
                <Plus /> Log activity
              </Link>
            </Button>
          )}
          {canEdit && (
            <>
              <Button asChild variant="outline">
                <Link href={`${here}/edit`}>
                  <Pencil /> Edit
                </Link>
              </Button>
              <ArchiveButton
                archived={!!c.archivedAt}
                action={setContactArchivedAction.bind(null, c.id)}
                label="contact"
              />
            </>
          )}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="flex flex-col gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Details</CardTitle>
            </CardHeader>
            <CardContent>
              <DetailList
                items={[
                  {
                    label: "Email",
                    value: c.email && (
                      <a
                        href={`mailto:${c.email}`}
                        className="text-primary inline-flex items-center gap-1 hover:underline"
                      >
                        <Mail className="size-3" /> {c.email}
                      </a>
                    ),
                  },
                  {
                    label: "Phone",
                    value: c.phone && (
                      <a href={`tel:${c.phone}`} className="inline-flex items-center gap-1 hover:underline">
                        <Phone className="size-3" /> {c.phone}
                      </a>
                    ),
                  },
                  {
                    label: "LinkedIn",
                    value: c.linkedinUrl && (
                      <a
                        href={c.linkedinUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary inline-flex items-center gap-1 hover:underline"
                      >
                        Profile <ExternalLink className="size-3" />
                      </a>
                    ),
                  },
                  { label: "Owners", value: c.owners.map((o) => o.name).join(", ") },
                  { label: "Strength", value: STRENGTH_LABELS[c.relationshipStrength] },
                  { label: "Language", value: LANGUAGE_LABELS[c.preferredLanguage] },
                  { label: "Notes", value: c.notes && <span className="whitespace-pre-line">{c.notes}</span> },
                  {
                    label: "Created",
                    value: `${formatDateTime(c.createdAt)}${c.createdBy ? ` by ${c.createdBy.name}` : ""}`,
                  },
                ]}
              />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Mailing consent (PDPA)</CardTitle>
              <CardDescription>Only send mailings to lists the contact has opted in to.</CardDescription>
            </CardHeader>
            <CardContent>
              <ConsentPanel
                contactId={c.id}
                canEdit={can(me, "update", "MailingConsent")}
                today={todayInBangkok().toISOString().slice(0, 10)}
                consents={c.consents.map((k) => ({
                  list: k.list,
                  optedIn: k.optedIn,
                  consentDate: k.consentDate.toISOString(),
                  withdrawnDate: k.withdrawnDate?.toISOString() ?? null,
                  source: k.source,
                  evidenceNote: k.evidenceNote,
                }))}
              />
            </CardContent>
          </Card>
          {events.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Events</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="flex flex-col gap-1.5 text-sm">
                  {events.map((i) => (
                    <li key={i.id} className="flex flex-wrap items-baseline gap-x-2">
                      <Link href={`/events/${i.event.id}`} className="hover:underline">
                        {i.event.title}
                      </Link>
                      <span className="text-muted-foreground text-xs">
                        {formatDate(i.event.startsAt)} · RSVP {RSVP_LABELS[i.rsvp]}
                        {i.attended === true ? " · attended" : i.attended === false ? " · did not attend" : ""}
                      </span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
          {referee.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Directory referee</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="flex flex-col gap-1.5 text-sm">
                  {referee.map((r) => (
                    <li key={r.id} className="flex flex-wrap items-baseline gap-x-2">
                      <Link href={`/rankings/submissions/${r.submission.id}`} className="hover:underline">
                        {r.submission.directory.name} {r.submission.year}
                      </Link>
                      <span className="text-muted-foreground text-xs">
                        {r.submission.practiceArea.name}
                        {r.briefed ? " · briefed" : " · not briefed"}
                      </span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
          <Card>
            <CardHeader>
              <CardTitle>Open tasks</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              <TaskList tasks={toTaskRows(me, tasks)} showLink={false} />
              {can(me, "create", "Task") && <QuickTaskForm contactId={c.id} />}
            </CardContent>
          </Card>
        </div>
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <ActivityTimeline activities={activities} actor={me} returnTo={here} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
