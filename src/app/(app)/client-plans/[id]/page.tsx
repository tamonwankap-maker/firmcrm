import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/server/auth/current-user";
import { can } from "@/server/auth/policy";
import { getClientPlan } from "@/features/client-plans/queries";
import { clientPlanFacts } from "@/features/client-plans/service";
import { setClientPlanArchivedAction, updateClientPlanAction } from "@/features/client-plans/actions";
import { ClientPlanForm } from "@/features/client-plans/components/client-plan-form";
import { practiceAreaOptions } from "@/features/lookups/options";
import { TaskList } from "@/features/tasks/components/task-list";
import { toTaskRows } from "@/features/tasks/to-rows";
import { ArchiveButton } from "@/components/records/archive-button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDateOnly } from "@/lib/dates";
import { HealthPill } from "@/features/client-plans/components/health-pill";

export const metadata: Metadata = { title: "Client plan" };

const GAP_LABEL = { won: "Already instructed", in_pipeline: "In the pipeline", gap: "Gap — no work yet" } as const;
const GAP_VARIANT = { won: "success", in_pipeline: "secondary", gap: "warning" } as const;

export default async function ClientPlanPage(props: PageProps<"/client-plans/[id]">) {
  const me = await requireUser();
  const { id } = await props.params;
  const data = await getClientPlan(me, id);
  if (!data) notFound();
  const { plan, gaps, usedWon, openPipeline } = data;
  const canEdit = can(me, "update", "ClientPlan", clientPlanFacts(plan));
  const practiceAreas = canEdit ? await practiceAreaOptions() : [];
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-muted-foreground text-sm">{plan.year} client plan</p>
          <h1 className="text-2xl font-semibold tracking-tight">
            <Link href={`/organisations/${plan.organisation.id}`} className="hover:underline">
              {plan.organisation.nameEn}
            </Link>
          </h1>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
            <HealthPill score={plan.healthScore} />
            {plan.reviewMeetingDate && <Badge variant="outline">Review {formatDateOnly(plan.reviewMeetingDate)}</Badge>}
            <span className="text-muted-foreground">Owner: {plan.owner?.name ?? "—"}</span>
          </div>
        </div>
        {canEdit && (
          <ArchiveButton
            archived={!!plan.archivedAt}
            action={setClientPlanArchivedAction.bind(null, plan.id)}
            label="plan"
          />
        )}
      </div>
      <div className="grid gap-6 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Cross-sell targets</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4 text-sm">
            {gaps.length === 0 ? (
              <p className="text-muted-foreground">No targets set.</p>
            ) : (
              <ul className="flex flex-col gap-2">
                {gaps.map((g) => (
                  <li key={g.id} className="flex items-center justify-between gap-2">
                    <span>{g.name}</span>
                    <Badge variant={GAP_VARIANT[g.status]}>{GAP_LABEL[g.status]}</Badge>
                  </li>
                ))}
              </ul>
            )}
            <div>
              <p className="font-medium">Practices instructed (won, last 3 years)</p>
              <p className="text-muted-foreground">{usedWon.map((p) => p.name).join(", ") || "None recorded"}</p>
            </div>
            <div>
              <p className="font-medium">Open pipeline</p>
              <p className="text-muted-foreground">{openPipeline.map((p) => p.name).join(", ") || "None"}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>{canEdit ? "Plan" : "Objectives"}</CardTitle>
          </CardHeader>
          <CardContent>
            {canEdit ? (
              <ClientPlanForm
                mode="edit"
                action={updateClientPlanAction.bind(null, plan.id)}
                practiceAreas={practiceAreas}
                defaults={{
                  organisation: null,
                  year: String(plan.year),
                  objectives: plan.objectives,
                  crossSellTargetIds: plan.crossSellTargets.map((t) => t.id),
                  reviewMeetingDate: plan.reviewMeetingDate ? plan.reviewMeetingDate.toISOString().slice(0, 10) : "",
                  healthScore: plan.healthScore,
                  owner: plan.owner ? { id: plan.owner.id, label: plan.owner.name } : null,
                }}
              />
            ) : (
              <p className="text-sm whitespace-pre-line">{plan.objectives}</p>
            )}
          </CardContent>
        </Card>
        {plan.tasks.length > 0 && (
          <Card className="lg:col-span-3">
            <CardHeader>
              <CardTitle>Open tasks</CardTitle>
            </CardHeader>
            <CardContent>
              <TaskList tasks={toTaskRows(me, plan.tasks)} showLink={false} />
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
