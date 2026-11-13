import type { Metadata } from "next";
import Link from "next/link";
import { Plus } from "lucide-react";
import { requireUser } from "@/server/auth/current-user";
import { can } from "@/server/auth/policy";
import { dashboardStats, recentActivities } from "@/features/dashboard/queries";
import { myNextActions } from "@/features/activities/queries";
import { ActivityTimeline } from "@/features/activities/components/activity-timeline";
import { myOpenTasks } from "@/features/tasks/queries";
import { toTaskRows } from "@/features/tasks/to-rows";
import { TaskList } from "@/features/tasks/components/task-list";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDate, formatDateOnly, formatDateTime } from "@/lib/dates";
import { formatThbCompact } from "@/lib/money";
import { Lock } from "lucide-react";
import { myOpenOpportunities } from "@/features/opportunities/queries";
import { weightedValueThb } from "@/features/opportunities/rules";
import { StageBadge } from "@/features/opportunities/components/badges";
import { myUpcomingPitches } from "@/features/pitches/queries";
import { checklistProgress } from "@/features/pitches/facts";
import { getSettings } from "@/features/settings/queries";
import { rankingDeadlines } from "@/features/rankings/queries";
import { daysUntil } from "@/features/rankings/rules";
import { myEventFollowUps, upcomingEvents } from "@/features/events/queries";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Dashboard" };

function Stat({ label, value, href, warn }: { label: string; value: number; href: string; warn?: boolean }) {
  return (
    <Link href={href} className="bg-card hover:bg-accent rounded-lg border p-4 transition-colors">
      <div className="text-muted-foreground text-xs font-medium tracking-wide uppercase">{label}</div>
      <div
        className={cn(
          "mt-1 text-2xl font-semibold tabular-nums",
          warn && value > 0 && "text-amber-700 dark:text-amber-300",
        )}
      >
        {value}
      </div>
    </Link>
  );
}

export default async function DashboardPage() {
  const me = await requireUser();
  const [stats, tasks, nextActions, recent, myOpps, pitches, settings, deadlines, events, followUps] =
    await Promise.all([
      dashboardStats(me),
      myOpenTasks(me),
      myNextActions(me),
      recentActivities(me),
      myOpenOpportunities(me),
      myUpcomingPitches(me),
      getSettings(),
      // BD sees the whole team calendar; others see their own.
      rankingDeadlines(me, { mine: !(me.role === "ADMIN" || me.role === "BD") }),
      upcomingEvents(),
      myEventFollowUps(me),
    ]);
  const myWeighted = myOpps.reduce((sum, o) => sum + weightedValueThb(o, settings.usdToThbRate), 0);
  const now = new Date();

  return (
    <>
      <PageHeader
        title={`Welcome, ${me.name.split(" ")[0]}`}
        description={formatDate(new Date())}
        actions={
          can(me, "create", "Activity") && (
            <>
              {(me.role === "ADMIN" || me.role === "BD") && (
                <Button asChild variant="outline">
                  <Link href="/reports">Firm overview</Link>
                </Button>
              )}
              <Button asChild>
                <Link href="/activities/new?returnTo=/dashboard">
                  <Plus /> Log activity
                </Link>
              </Button>
            </>
          )
        }
      />
      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="My organisations" value={stats.myOrgs} href="/organisations?mine=1" />
        <Stat label="My contacts" value={stats.myContacts} href="/contacts?mine=1" />
        <Stat label="My activities this month" value={stats.myActivitiesThisMonth} href="/activities?mine=1" />
        <Stat label="Overdue next actions" value={stats.overdueNextActions} href="#next-actions" warn />
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>My tasks</CardTitle>
            <Link href="/tasks" className="text-primary text-sm hover:underline">
              All tasks
            </Link>
          </CardHeader>
          <CardContent>
            <TaskList tasks={toTaskRows(me, tasks)} showOwner={false} emptyMessage="No open tasks." />
          </CardContent>
        </Card>
        <Card id="next-actions">
          <CardHeader>
            <CardTitle>My next actions</CardTitle>
          </CardHeader>
          <CardContent>
            <ActivityTimeline
              activities={nextActions}
              actor={me}
              emptyMessage="No open next actions."
              returnTo="/dashboard"
            />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>My pipeline</CardTitle>
            <Link href="/opportunities?mine=1" className="text-primary text-sm hover:underline">
              {myOpps.length} open · {formatThbCompact(myWeighted)} weighted
            </Link>
          </CardHeader>
          <CardContent>
            {myOpps.length === 0 ? (
              <p className="text-muted-foreground text-sm">You are not on any open opportunities.</p>
            ) : (
              <ul className="flex flex-col divide-y">
                {myOpps.map((o) => (
                  <li key={o.id} className="flex flex-wrap items-center gap-2 py-2 text-sm">
                    <Link href={`/opportunities/${o.id}`} className="font-medium hover:underline">
                      {o.confidential && (
                        <Lock className="text-destructive mr-1 inline size-3" aria-label="Confidential" />
                      )}
                      {o.name}
                    </Link>
                    <StageBadge stage={o.stage} />
                    <span className="text-muted-foreground text-xs">
                      {o.organisation.nameEn}
                      {o.expectedDecisionDate && ` · decision ${formatDateOnly(o.expectedDecisionDate)}`}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>Pitch deadlines</CardTitle>
            <Link href="/pitches?mine=1" className="text-primary text-sm hover:underline">
              All pitches
            </Link>
          </CardHeader>
          <CardContent>
            {pitches.length === 0 ? (
              <p className="text-muted-foreground text-sm">No pitches in progress.</p>
            ) : (
              <ul className="flex flex-col divide-y">
                {pitches.map((p) => {
                  const prog = checklistProgress(p.checklist);
                  const overdue = p.deadline < now;
                  return (
                    <li key={p.id} className="flex flex-wrap items-center gap-2 py-2 text-sm">
                      <Link href={`/pitches/${p.id}`} className="font-medium hover:underline">
                        {p.opportunity.name}
                      </Link>
                      <span
                        className={cn("text-xs", overdue ? "text-destructive font-medium" : "text-muted-foreground")}
                      >
                        {overdue ? "Overdue · " : "Due "}
                        {formatDateTime(p.deadline)}
                      </span>
                      <span className="text-muted-foreground text-xs">
                        Checklist {prog.done}/{prog.total}
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>Upcoming events</CardTitle>
            <Link href="/events" className="text-primary text-sm hover:underline">
              All events
            </Link>
          </CardHeader>
          <CardContent>
            {events.length === 0 ? (
              <p className="text-muted-foreground text-sm">No upcoming events.</p>
            ) : (
              <ul className="flex flex-col divide-y">
                {events.map((e) => (
                  <li key={e.id} className="flex flex-wrap items-baseline gap-x-2 py-2 text-sm">
                    <Link href={`/events/${e.id}`} className="font-medium hover:underline">
                      {e.title}
                    </Link>
                    <span className="text-muted-foreground text-xs">
                      {formatDateTime(e.startsAt)} · {e.invites.filter((i) => i.rsvp === "YES").length} attending
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>My event follow-ups</CardTitle>
          </CardHeader>
          <CardContent>
            {followUps.length === 0 ? (
              <p className="text-muted-foreground text-sm">No follow-ups assigned to you.</p>
            ) : (
              <ul className="flex flex-col divide-y">
                {followUps.map((f) => (
                  <li key={f.id} className="flex flex-wrap items-baseline gap-x-2 py-2 text-sm">
                    <Link href={`/contacts/${f.contact.id}`} className="font-medium hover:underline">
                      {f.contact.nameEn}
                    </Link>
                    <span className="text-muted-foreground text-xs">
                      {f.contact.organisation?.nameEn ? `${f.contact.organisation.nameEn} · ` : ""}
                      attended{" "}
                      <Link href={`/events/${f.event.id}`} className="hover:underline">
                        {f.event.title}
                      </Link>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
        <Card className="lg:col-span-2">
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>Rankings &amp; awards deadlines</CardTitle>
            <Link href="/rankings" className="text-primary text-sm hover:underline">
              All submissions
            </Link>
          </CardHeader>
          <CardContent>
            {deadlines.subs.length + deadlines.awards.length === 0 ? (
              <p className="text-muted-foreground text-sm">Nothing due in the next 60 days.</p>
            ) : (
              <ul className="grid gap-x-6 sm:grid-cols-2">
                {deadlines.subs.map((s) => {
                  const d = s.deadline ? daysUntil(s.deadline, deadlines.today) : null;
                  return (
                    <li key={s.id} className="flex flex-wrap items-baseline gap-x-2 border-b py-2 text-sm">
                      <Link href={`/rankings/submissions/${s.id}`} className="font-medium hover:underline">
                        {s.directory.name} {s.year} — {s.practiceArea.name}
                      </Link>
                      <span
                        className={cn(
                          "text-xs",
                          d != null && d < 0
                            ? "text-destructive font-medium"
                            : d != null && d <= 14
                              ? "text-amber-700 dark:text-amber-300"
                              : "text-muted-foreground",
                        )}
                      >
                        {d == null ? "" : d < 0 ? `${-d} days overdue` : `due ${formatDateOnly(s.deadline)}`}
                      </span>
                    </li>
                  );
                })}
                {deadlines.awards.map((a) => (
                  <li key={a.id} className="flex flex-wrap items-baseline gap-x-2 border-b py-2 text-sm">
                    <Link href={`/awards/${a.id}`} className="font-medium hover:underline">
                      {a.name} — {a.category}
                    </Link>
                    <span className="text-muted-foreground text-xs">due {formatDateOnly(a.deadline)}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
        <Card className="lg:col-span-2">
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>Recent firm activity</CardTitle>
            <Link href="/activities" className="text-primary text-sm hover:underline">
              All activities
            </Link>
          </CardHeader>
          <CardContent>
            <ActivityTimeline activities={recent} actor={me} returnTo="/dashboard" />
          </CardContent>
        </Card>
      </div>
    </>
  );
}
