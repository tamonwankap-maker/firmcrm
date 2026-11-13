import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ExternalLink, Pencil, Plus, Star } from "lucide-react";
import { requireUser } from "@/server/auth/current-user";
import { can } from "@/server/auth/policy";
import { getOrganisation } from "@/features/organisations/queries";
import { organisationFacts } from "@/features/organisations/facts";
import { setOrganisationArchivedAction } from "@/features/organisations/actions";
import { activitiesFor } from "@/features/activities/queries";
import { ActivityTimeline } from "@/features/activities/components/activity-timeline";
import { TaskList } from "@/features/tasks/components/task-list";
import { QuickTaskForm } from "@/features/tasks/components/quick-task-form";
import { toTaskRows } from "@/features/tasks/to-rows";
import { ORG_STATUS_LABELS, ORG_TYPE_LABELS, STRENGTH_LABELS } from "@/features/labels";
import { ArchiveButton } from "@/components/records/archive-button";
import { DetailList } from "@/components/records/detail-list";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { countryName } from "@/lib/countries";
import { formatDateTime } from "@/lib/dates";
import { db } from "@/server/db";
import { opportunitiesForOrganisation } from "@/features/opportunities/queries";
import { mattersForOrganisation } from "@/features/matters/queries";
import { plansForOrganisation } from "@/features/client-plans/queries";
import { HealthPill } from "@/features/client-plans/components/health-pill";
import { StageBadge } from "@/features/opportunities/components/badges";
import { formatFeeRange } from "@/lib/money";
import { Lock } from "lucide-react";

export async function generateMetadata(props: PageProps<"/organisations/[id]">): Promise<Metadata> {
  const { id } = await props.params;
  const o = await db.organisation.findUnique({ where: { id }, select: { nameEn: true } });
  return { title: o?.nameEn ?? "Organisation" };
}

export default async function OrganisationPage(props: PageProps<"/organisations/[id]">) {
  const me = await requireUser();
  const { id } = await props.params;
  const org = await getOrganisation(me, id);
  if (!org) notFound();
  const facts = organisationFacts(org);
  const canEdit = can(me, "update", "Organisation", facts);
  const canAddActivity = can(me, "create", "Activity");
  const [activities, opportunities, matters, plans] = await Promise.all([
    activitiesFor(me, { organisationId: org.id }),
    opportunitiesForOrganisation(me, org.id),
    mattersForOrganisation(me, org.id),
    plansForOrganisation(org.id),
  ]);
  const here = `/organisations/${org.id}`;

  return (
    <div className="flex flex-col gap-6">
      {org.archivedAt && (
        <Alert variant="warning">This organisation is archived. It is hidden from lists and pickers.</Alert>
      )}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
            {org.isKeyClient && <Star className="fill-brand-gold text-brand-gold size-5" aria-label="Key client" />}
            {org.nameEn}
          </h1>
          {org.nameTh && (
            <p className="text-muted-foreground text-lg" lang="th">
              {org.nameTh}
            </p>
          )}
          <div className="mt-2 flex flex-wrap gap-2">
            <Badge variant="secondary">{ORG_TYPE_LABELS[org.type]}</Badge>
            <Badge variant={org.status === "ACTIVE" ? "success" : org.status === "DORMANT" ? "warning" : "destructive"}>
              {ORG_STATUS_LABELS[org.status]}
            </Badge>
            {org.isKeyClient && <Badge variant="warning">Key client</Badge>}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {canAddActivity && (
            <Button asChild>
              <Link href={`/activities/new?org=${org.id}&returnTo=${encodeURIComponent(here)}`}>
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
                archived={!!org.archivedAt}
                action={setOrganisationArchivedAction.bind(null, org.id)}
                label="organisation"
              />
            </>
          )}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="flex flex-col gap-6 lg:col-span-1">
          {(plans.length > 0 || (org.isKeyClient && can(me, "create", "ClientPlan"))) && (
            <Card>
              <CardHeader className="flex-row items-center justify-between">
                <CardTitle>Client plan</CardTitle>
                {can(me, "create", "ClientPlan") && (
                  <Button asChild size="sm" variant="outline">
                    <Link href={`/client-plans/new?org=${org.id}`}>
                      <Plus /> New
                    </Link>
                  </Button>
                )}
              </CardHeader>
              <CardContent>
                {plans.length === 0 ? (
                  <p className="text-muted-foreground text-sm">No plan yet for this key client.</p>
                ) : (
                  <ul className="flex flex-col gap-2 text-sm">
                    {plans.map((p) => (
                      <li key={p.id} className="flex items-center justify-between gap-2">
                        <Link href={`/client-plans/${p.id}`} className="font-medium hover:underline">
                          {p.year} plan
                        </Link>
                        <HealthPill score={p.healthScore} />
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          )}
          <Card>
            <CardHeader>
              <CardTitle>Details</CardTitle>
            </CardHeader>
            <CardContent>
              <DetailList
                items={[
                  { label: "Relationship partner", value: org.relationshipPartner?.name },
                  { label: "Industry", value: org.industry?.name },
                  { label: "Country", value: countryName(org.country) },
                  {
                    label: "Website",
                    value: org.website && (
                      <a
                        href={org.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary inline-flex items-center gap-1 hover:underline"
                      >
                        {org.website.replace(/^https?:\/\//, "")} <ExternalLink className="size-3" />
                      </a>
                    ),
                  },
                  { label: "Notes", value: org.notes && <span className="whitespace-pre-line">{org.notes}</span> },
                  {
                    label: "Created",
                    value: `${formatDateTime(org.createdAt)}${org.createdBy ? ` by ${org.createdBy.name}` : ""}`,
                  },
                ]}
              />
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex-row items-center justify-between">
              <CardTitle>Contacts ({org.contacts.length})</CardTitle>
              {can(me, "create", "Contact") && (
                <Button asChild size="sm" variant="outline">
                  <Link href={`/contacts/new?org=${org.id}`}>
                    <Plus /> Add
                  </Link>
                </Button>
              )}
            </CardHeader>
            <CardContent>
              {org.contacts.length === 0 ? (
                <p className="text-muted-foreground text-sm">No contacts yet.</p>
              ) : (
                <ul className="flex flex-col divide-y text-sm">
                  {org.contacts.map((c) => (
                    <li key={c.id} className="py-2">
                      <Link href={`/contacts/${c.id}`} className="font-medium hover:underline">
                        {c.nameEn}
                      </Link>
                      {c.nameTh && (
                        <span className="text-muted-foreground" lang="th">
                          {" "}
                          · {c.nameTh}
                        </span>
                      )}
                      <div className="text-muted-foreground text-xs">
                        {[c.title, c.email, STRENGTH_LABELS[c.relationshipStrength]].filter(Boolean).join(" · ")}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Open tasks</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              <TaskList tasks={toTaskRows(me, org.tasks)} showLink={false} />
              {can(me, "create", "Task") && <QuickTaskForm organisationId={org.id} />}
            </CardContent>
          </Card>
        </div>
        <div className="flex flex-col gap-6 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Activity</CardTitle>
            </CardHeader>
            <CardContent>
              <ActivityTimeline activities={activities} actor={me} showOrganisation={false} returnTo={here} />
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex-row items-center justify-between">
              <CardTitle>Opportunities ({opportunities.length})</CardTitle>
              {can(me, "create", "Opportunity") && (
                <Button asChild size="sm" variant="outline">
                  <Link href={`/opportunities/new?org=${org.id}`}>
                    <Plus /> New
                  </Link>
                </Button>
              )}
            </CardHeader>
            <CardContent>
              {opportunities.length === 0 ? (
                <p className="text-muted-foreground text-sm">No opportunities yet.</p>
              ) : (
                <ul className="flex flex-col divide-y">
                  {opportunities.map((o) => (
                    <li key={o.id} className="flex flex-wrap items-center gap-2 py-2 text-sm">
                      <Link href={`/opportunities/${o.id}`} className="font-medium hover:underline">
                        {o.confidential && (
                          <Lock className="text-destructive mr-1 inline size-3" aria-label="Confidential" />
                        )}
                        {o.name}
                      </Link>
                      <StageBadge stage={o.stage} />
                      <span className="text-muted-foreground text-xs">
                        {[o.leadPartner.name, formatFeeRange(o.feeEstimateMin, o.feeEstimateMax, o.currency)]
                          .filter(Boolean)
                          .join(" · ")}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
          {matters.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Representative matters ({matters.length})</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="flex flex-col divide-y text-sm">
                  {matters.map((m) => (
                    <li key={m.id} className="py-2">
                      <Link href={`/matters/${m.id}`} className="font-medium hover:underline">
                        {m.confidential && (
                          <Lock className="text-destructive mr-1 inline size-3" aria-label="Confidential" />
                        )}
                        {m.title}
                      </Link>
                      <span className="text-muted-foreground text-xs"> · {m.year}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
