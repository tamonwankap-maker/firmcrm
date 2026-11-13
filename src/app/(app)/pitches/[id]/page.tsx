import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/server/auth/current-user";
import { can } from "@/server/auth/policy";
import { getPitch } from "@/features/pitches/queries";
import { pitchFacts } from "@/features/pitches/facts";
import { setPitchArchivedAction, updatePitchAction } from "@/features/pitches/actions";
import { PitchForm } from "@/features/pitches/components/pitch-form";
import { PitchChecklist } from "@/features/pitches/components/checklist";
import { ConfidentialBadge } from "@/features/opportunities/components/badges";
import { TaskList } from "@/features/tasks/components/task-list";
import { QuickTaskForm } from "@/features/tasks/components/quick-task-form";
import { toTaskRows } from "@/features/tasks/to-rows";
import { PITCH_FORMAT_LABELS, PITCH_STATUS_LABELS } from "@/features/labels";
import { ArchiveButton } from "@/components/records/archive-button";
import { DetailList } from "@/components/records/detail-list";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDateTime, toBangkokInput } from "@/lib/dates";

export const metadata: Metadata = { title: "Pitch" };

export default async function PitchPage(props: PageProps<"/pitches/[id]">) {
  const me = await requireUser();
  const { id } = await props.params;
  const p = await getPitch(me, id);
  if (!p) notFound();
  const canEdit = can(me, "update", "Pitch", pitchFacts(p));
  const overdue = p.status !== "SUBMITTED" && p.deadline < new Date();
  const outstanding = p.checklist.filter((c) => !c.done).length;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-muted-foreground text-sm">Pitch for</p>
          <h1 className="text-2xl font-semibold tracking-tight">
            <Link href={`/opportunities/${p.opportunity.id}`} className="hover:underline">
              {p.opportunity.name}
            </Link>
          </h1>
          <p className="text-sm">{p.opportunity.organisation.nameEn}</p>
          <div className="mt-2 flex flex-wrap gap-2">
            <Badge variant={p.status === "SUBMITTED" ? "success" : overdue ? "destructive" : "secondary"}>
              {overdue ? "Overdue" : PITCH_STATUS_LABELS[p.status]}
            </Badge>
            <Badge variant="outline">Due {formatDateTime(p.deadline)}</Badge>
            {p.opportunity.confidential && <ConfidentialBadge />}
          </div>
        </div>
        {canEdit && (
          <ArchiveButton archived={!!p.archivedAt} action={setPitchArchivedAction.bind(null, p.id)} label="pitch" />
        )}
      </div>
      {p.status === "SUBMITTED" && outstanding > 0 && (
        <Alert variant="warning">Marked as submitted with {outstanding} checklist item(s) still open.</Alert>
      )}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Checklist</CardTitle>
          </CardHeader>
          <CardContent>
            <PitchChecklist
              pitchId={p.id}
              canEdit={canEdit}
              items={p.checklist.map((c) => ({ id: c.id, label: c.label, done: c.done, isStandard: c.isStandard }))}
            />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>{canEdit ? "Edit pitch" : "Details"}</CardTitle>
          </CardHeader>
          <CardContent>
            {canEdit ? (
              <PitchForm
                mode="edit"
                action={updatePitchAction.bind(null, p.id)}
                defaults={{
                  opportunity: null,
                  deadline: toBangkokInput(p.deadline),
                  owner: { id: p.owner.id, label: p.owner.name },
                  format: p.format,
                  status: p.status,
                  notes: p.notes ?? "",
                }}
              />
            ) : (
              <DetailList
                items={[
                  { label: "Owner", value: p.owner.name },
                  { label: "Format", value: PITCH_FORMAT_LABELS[p.format] },
                  { label: "Lead partner", value: p.opportunity.leadPartner.name },
                  { label: "Notes", value: p.notes },
                ]}
              />
            )}
          </CardContent>
        </Card>
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Open tasks</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <TaskList tasks={toTaskRows(me, p.tasks)} showLink={false} />
            {can(me, "create", "Task") && <QuickTaskForm pitchId={p.id} />}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
