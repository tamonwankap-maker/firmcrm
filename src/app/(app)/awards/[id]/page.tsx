import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireUser } from "@/server/auth/current-user";
import { can } from "@/server/auth/policy";
import { getAward } from "@/features/awards/queries";
import { awardFacts } from "@/features/awards/service";
import { setAwardArchivedAction, updateAwardAction } from "@/features/awards/actions";
import { AwardForm } from "@/features/awards/components/award-form";
import { practiceAreaOptions } from "@/features/lookups/options";
import { AWARD_STATUS_LABELS } from "@/features/labels";
import { PageHeader } from "@/components/layout/page-header";
import { ArchiveButton } from "@/components/records/archive-button";
import { DetailList } from "@/components/records/detail-list";
import { Card, CardContent } from "@/components/ui/card";
import { formatDateOnly } from "@/lib/dates";

export const metadata: Metadata = { title: "Award" };

export default async function AwardPage(props: PageProps<"/awards/[id]">) {
  const me = await requireUser();
  const { id } = await props.params;
  const a = await getAward(id);
  if (!a) notFound();
  const canEdit = can(me, "update", "Award", awardFacts(a));
  const practiceAreas = canEdit ? await practiceAreaOptions() : [];
  return (
    <div className="max-w-4xl">
      <PageHeader
        title={`${a.name} ${a.year}`}
        description={a.category}
        actions={
          canEdit && (
            <ArchiveButton
              archived={!!a.archivedAt}
              action={setAwardArchivedAction.bind(null, a.id)}
              label="award entry"
            />
          )
        }
      />
      <Card>
        <CardContent className="pt-5">
          {canEdit ? (
            <AwardForm
              action={updateAwardAction.bind(null, a.id)}
              practiceAreas={practiceAreas}
              submitLabel="Save changes"
              defaults={{
                name: a.name,
                organiser: a.organiser ?? "",
                category: a.category,
                year: String(a.year),
                deadline: a.deadline ? a.deadline.toISOString().slice(0, 10) : "",
                owner: a.owner ? { id: a.owner.id, label: a.owner.name } : null,
                practiceAreaIds: a.practiceAreas.map((p) => p.id),
                status: a.status,
                notes: a.notes ?? "",
              }}
            />
          ) : (
            <DetailList
              items={[
                { label: "Organiser", value: a.organiser },
                { label: "Deadline", value: formatDateOnly(a.deadline) },
                { label: "Status", value: AWARD_STATUS_LABELS[a.status] },
                { label: "Owner", value: a.owner?.name },
                { label: "Practice areas", value: a.practiceAreas.map((p) => p.name).join(", ") },
                { label: "Notes", value: a.notes },
              ]}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
