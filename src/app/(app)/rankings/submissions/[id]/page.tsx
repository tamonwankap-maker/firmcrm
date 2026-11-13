import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Lock } from "lucide-react";
import { requireUser } from "@/server/auth/current-user";
import { can } from "@/server/auth/policy";
import { getSubmission } from "@/features/rankings/queries";
import { submissionFacts } from "@/features/rankings/facts";
import { matterClientLabel } from "@/features/rankings/rules";
import { setSubmissionArchivedAction, updateSubmissionAction } from "@/features/rankings/actions";
import { SubmissionForm } from "@/features/rankings/components/submission-form";
import { RefereePanel } from "@/features/rankings/components/referee-panel";
import { directoryOptions } from "@/features/lookups/directory-options";
import { practiceAreaOptions } from "@/features/lookups/options";
import { SUBMISSION_STATUS_LABELS } from "@/features/labels";
import { ArchiveButton } from "@/components/records/archive-button";
import { DetailList } from "@/components/records/detail-list";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDateOnly } from "@/lib/dates";

export const metadata: Metadata = { title: "Submission" };

export default async function SubmissionPage(props: PageProps<"/rankings/submissions/[id]">) {
  const me = await requireUser();
  const { id } = await props.params;
  const s = await getSubmission(me, id);
  if (!s) notFound();
  const canEdit = can(me, "update", "DirectorySubmission", submissionFacts(s));
  const [directories, practiceAreas] = canEdit
    ? await Promise.all([directoryOptions(), practiceAreaOptions()])
    : [[], []];

  return (
    <div className="flex flex-col gap-6">
      {s.archivedAt && <Alert variant="warning">This submission is archived.</Alert>}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {s.directory.name} {s.year} — {s.practiceArea.name}
          </h1>
          <div className="mt-2 flex flex-wrap gap-2">
            <Badge variant="secondary">{SUBMISSION_STATUS_LABELS[s.status]}</Badge>
            {s.deadline && <Badge variant="outline">Deadline {formatDateOnly(s.deadline)}</Badge>}
            {s.resultTier && <Badge variant="success">{s.resultTier}</Badge>}
          </div>
        </div>
        {canEdit && (
          <ArchiveButton
            archived={!!s.archivedAt}
            action={setSubmissionArchivedAction.bind(null, s.id)}
            label="submission"
          />
        )}
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Referees</CardTitle>
          </CardHeader>
          <CardContent>
            <RefereePanel
              submissionId={s.id}
              canEdit={canEdit}
              referees={s.referees.map((r) => ({
                id: r.id,
                contact: {
                  id: r.contact.id,
                  name: r.contact.nameTh ? `${r.contact.nameEn} (${r.contact.nameTh})` : r.contact.nameEn,
                  sub: [r.contact.title, r.contact.organisation?.nameEn].filter(Boolean).join(" · "),
                },
                briefed: r.briefed,
                briefedDate: formatDateOnly(r.briefedDate),
                notes: r.notes,
                warnings: r.warnings,
              }))}
            />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Representative matters ({s.matters.length + s.hiddenMatters})</CardTitle>
          </CardHeader>
          <CardContent>
            {s.matters.length === 0 && s.hiddenMatters === 0 ? (
              <p className="text-muted-foreground text-sm">No matters linked yet.</p>
            ) : (
              <ul className="flex flex-col divide-y text-sm">
                {s.matters.map((m) => (
                  <li key={m.id} className="py-2">
                    <Link href={`/matters/${m.id}`} className="font-medium hover:underline">
                      {m.confidential && (
                        <Lock className="text-destructive mr-1 inline size-3" aria-label="Confidential" />
                      )}
                      {m.title}
                    </Link>
                    <div className="text-muted-foreground text-xs">
                      {m.year} · {matterClientLabel(m)}
                      {!m.publishable && " · not publishable"}
                    </div>
                  </li>
                ))}
                {s.hiddenMatters > 0 && (
                  <li className="text-muted-foreground py-2 text-xs">
                    <Lock className="mr-1 inline size-3" /> + {s.hiddenMatters} confidential matter(s) you do not have
                    access to
                  </li>
                )}
              </ul>
            )}
          </CardContent>
        </Card>
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>{canEdit ? "Edit submission" : "Details"}</CardTitle>
          </CardHeader>
          <CardContent>
            {canEdit ? (
              <SubmissionForm
                mode="edit"
                action={updateSubmissionAction.bind(null, s.id)}
                directories={directories}
                practiceAreas={practiceAreas}
                defaults={{
                  directoryId: s.directoryId,
                  year: String(s.year),
                  practiceAreaId: s.practiceAreaId,
                  deadline: s.deadline ? s.deadline.toISOString().slice(0, 10) : "",
                  owner: { id: s.owner.id, label: s.owner.name },
                  partnerReviewer: s.partnerReviewer
                    ? { id: s.partnerReviewer.id, label: s.partnerReviewer.name }
                    : null,
                  status: s.status,
                  resultTier: s.resultTier ?? "",
                  rankedLawyers: s.rankedLawyers.map((u) => ({ id: u.id, label: u.name })),
                  matters: s.matters.map((m) => ({ id: m.id, label: m.title, sub: String(m.year) })),
                  notes: s.notes ?? "",
                }}
              />
            ) : (
              <DetailList
                items={[
                  { label: "Owner", value: s.owner.name },
                  { label: "Partner reviewer", value: s.partnerReviewer?.name },
                  { label: "Ranked lawyers", value: s.rankedLawyers.map((u) => u.name).join(", ") },
                  { label: "Notes", value: s.notes && <span className="whitespace-pre-line">{s.notes}</span> },
                ]}
              />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
