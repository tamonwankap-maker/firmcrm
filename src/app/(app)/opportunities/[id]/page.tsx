import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CalendarClock, Pencil, Plus } from "lucide-react";
import { requireUser } from "@/server/auth/current-user";
import { can } from "@/server/auth/policy";
import { db } from "@/server/db";
import { opportunityVisibleWhere } from "@/server/auth/visibility";
import { getOpportunityDetail } from "@/features/opportunities/queries";
import { opportunityFacts } from "@/features/opportunities/facts";
import { setOpportunityArchivedAction } from "@/features/opportunities/actions";
import { weightedValueThb } from "@/features/opportunities/rules";
import { ConfidentialBadge, ConflictBadge, StageBadge } from "@/features/opportunities/components/badges";
import { StageChanger } from "@/features/opportunities/components/stage-changer";
import { ActivityTimeline } from "@/features/activities/components/activity-timeline";
import { TaskList } from "@/features/tasks/components/task-list";
import { QuickTaskForm } from "@/features/tasks/components/quick-task-form";
import { toTaskRows } from "@/features/tasks/to-rows";
import { checklistProgress } from "@/features/pitches/facts";
import { getSettings } from "@/features/settings/queries";
import { OPP_SOURCE_LABELS, OUTCOME_REASON_LABELS, PITCH_STATUS_LABELS, STAGE_LABELS } from "@/features/labels";
import { ArchiveButton } from "@/components/records/archive-button";
import { DetailList } from "@/components/records/detail-list";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDateOnly, formatDateTime, todayInBangkok } from "@/lib/dates";
import { formatFeeRange, formatMoney } from "@/lib/money";

export async function generateMetadata(props: PageProps<"/opportunities/[id]">): Promise<Metadata> {
  const me = await requireUser();
  const { id } = await props.params;
  const o = await db.opportunity.findFirst({
    where: { AND: [{ id }, opportunityVisibleWhere(me, { includeArchived: true })] },
    select: { name: true },
  });
  return { title: o?.name ?? "Opportunity" };
}

export default async function OpportunityPage(props: PageProps<"/opportunities/[id]">) {
  const me = await requireUser();
  const { id } = await props.params;
  const [o, settings] = await Promise.all([getOpportunityDetail(me, id), getSettings()]);
  if (!o) notFound();
  const canEdit = can(me, "update", "Opportunity", opportunityFacts(o));
  const here = `/opportunities/${o.id}`;
  const closed = o.stage === "WON" || o.stage === "LOST";
  const today = todayInBangkok();

  return (
    <div className="flex flex-col gap-6">
      {o.archivedAt && <Alert variant="warning">This opportunity is archived.</Alert>}
      {o.conflictStatus === "CONFLICT" && !closed && (
        <Alert variant="destructive">
          The conflict check found a conflict. This opportunity cannot be marked as Won.
        </Alert>
      )}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{o.name}</h1>
          <p className="mt-1 text-sm">
            <Link href={`/organisations/${o.organisation.id}`} className="text-primary hover:underline">
              {o.organisation.nameEn}
            </Link>
            {o.organisation.nameTh && (
              <span className="text-muted-foreground" lang="th">
                {" "}
                · {o.organisation.nameTh}
              </span>
            )}
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            <StageBadge stage={o.stage} />
            <ConflictBadge status={o.conflictStatus} />
            {o.confidential && <ConfidentialBadge />}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {can(me, "create", "Activity") && (
            <Button asChild variant="outline">
              <Link href={`/activities/new?opportunity=${o.id}&returnTo=${encodeURIComponent(here)}`}>
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
                archived={!!o.archivedAt}
                action={setOpportunityArchivedAction.bind(null, o.id)}
                label="opportunity"
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
                  { label: "Lead partner", value: o.leadPartner.name },
                  { label: "Team", value: o.team.map((t) => t.name).join(", ") },
                  { label: "Practice areas", value: o.practiceAreas.map((p) => p.name).join(", ") },
                  {
                    label: "Source",
                    value: [OPP_SOURCE_LABELS[o.source], o.referrerOrg?.nameEn, o.referrerContact?.nameEn]
                      .filter(Boolean)
                      .join(" · "),
                  },
                  { label: "Fee estimate", value: formatFeeRange(o.feeEstimateMin, o.feeEstimateMax, o.currency) },
                  {
                    label: "Probability",
                    value: `${o.probability}% · weighted ${formatMoney(Math.round(weightedValueThb(o, settings.usdToThbRate)), "THB")}`,
                  },
                  { label: "Expected decision", value: formatDateOnly(o.expectedDecisionDate) },
                  { label: "Competitors", value: o.competitors.join(", ") },
                  ...(closed
                    ? [
                        {
                          label: "Outcome",
                          value: o.outcomeReason
                            ? `${STAGE_LABELS[o.stage]} — ${OUTCOME_REASON_LABELS[o.outcomeReason]}`
                            : "",
                        },
                        { label: "Outcome notes", value: o.outcome },
                        { label: "Decided", value: formatDateOnly(o.closedDate) },
                      ]
                    : []),
                  {
                    label: "Created",
                    value: `${formatDateTime(o.createdAt)}${o.createdBy ? ` by ${o.createdBy.name}` : ""}`,
                  },
                ]}
              />
            </CardContent>
          </Card>
          {canEdit && !o.archivedAt && (
            <Card>
              <CardHeader>
                <CardTitle>Change stage</CardTitle>
              </CardHeader>
              <CardContent>
                <StageChanger opportunityId={o.id} current={o.stage} today={today.toISOString().slice(0, 10)} />
              </CardContent>
            </Card>
          )}
          <Card>
            <CardHeader>
              <CardTitle>Stage history</CardTitle>
            </CardHeader>
            <CardContent>
              <ol className="flex flex-col gap-2 text-sm">
                {o.stageChanges.map((c) => (
                  <li key={c.id} className="flex flex-wrap items-baseline gap-x-2">
                    <span className="text-muted-foreground text-xs whitespace-nowrap tabular-nums">
                      {formatDateTime(c.changedAt)}
                    </span>
                    <span>
                      {c.fromStage ? `${STAGE_LABELS[c.fromStage]} → ` : "Created as "}
                      <span className="font-medium">{STAGE_LABELS[c.toStage]}</span>
                    </span>
                    {c.changedBy && <span className="text-muted-foreground text-xs">by {c.changedBy.name}</span>}
                  </li>
                ))}
              </ol>
            </CardContent>
          </Card>
        </div>
        <div className="flex flex-col gap-6 lg:col-span-2">
          <Card>
            <CardHeader className="flex-row items-center justify-between">
              <CardTitle>Pitches</CardTitle>
              {canEdit && (
                <Button asChild size="sm" variant="outline">
                  <Link href={`/pitches/new?opportunity=${o.id}`}>
                    <Plus /> New pitch
                  </Link>
                </Button>
              )}
            </CardHeader>
            <CardContent>
              {o.pitches.length === 0 ? (
                <p className="text-muted-foreground text-sm">No pitches yet.</p>
              ) : (
                <ul className="flex flex-col divide-y">
                  {o.pitches.map((p) => {
                    const prog = checklistProgress(p.checklist);
                    const overdue = p.status !== "SUBMITTED" && p.deadline < new Date();
                    return (
                      <li key={p.id} className="flex flex-wrap items-center gap-2 py-2 text-sm">
                        <CalendarClock className="text-muted-foreground size-4" aria-hidden />
                        <Link href={`/pitches/${p.id}`} className="font-medium hover:underline">
                          Due {formatDateTime(p.deadline)}
                        </Link>
                        <Badge variant={p.status === "SUBMITTED" ? "success" : overdue ? "destructive" : "secondary"}>
                          {overdue ? "Overdue" : PITCH_STATUS_LABELS[p.status]}
                        </Badge>
                        <span className="text-muted-foreground text-xs">
                          Checklist {prog.done}/{prog.total} · {p.owner.name}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Open tasks</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              <TaskList tasks={toTaskRows(me, o.tasks)} showLink={false} />
              {can(me, "create", "Task") && <QuickTaskForm opportunityId={o.id} />}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Activity</CardTitle>
            </CardHeader>
            <CardContent>
              <ActivityTimeline activities={o.activities} actor={me} returnTo={here} />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
