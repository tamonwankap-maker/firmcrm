import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireUser } from "@/server/auth/current-user";
import { can } from "@/server/auth/policy";
import { getContent } from "@/features/content/queries";
import { contentFacts } from "@/features/content/service";
import { setContentArchivedAction, updateContentAction } from "@/features/content/actions";
import { ContentForm } from "@/features/content/components/content-form";
import { practiceAreaOptions } from "@/features/lookups/options";
import { CONTENT_STATUS_LABELS, CONTENT_TYPE_LABELS } from "@/features/labels";
import { PageHeader } from "@/components/layout/page-header";
import { ArchiveButton } from "@/components/records/archive-button";
import { DetailList } from "@/components/records/detail-list";
import { Card, CardContent } from "@/components/ui/card";
import { formatDateOnly } from "@/lib/dates";

export const metadata: Metadata = { title: "Content" };

export default async function ContentItemPage(props: PageProps<"/content/[id]">) {
  const me = await requireUser();
  const { id } = await props.params;
  const c = await getContent(id);
  if (!c) notFound();
  const canEdit = can(me, "update", "Content", contentFacts(c));
  const practiceAreas = canEdit ? await practiceAreaOptions() : [];
  return (
    <div className="max-w-4xl">
      <PageHeader
        title={c.title}
        description={`${CONTENT_TYPE_LABELS[c.type]} · ${CONTENT_STATUS_LABELS[c.status]}`}
        actions={
          canEdit && (
            <ArchiveButton archived={!!c.archivedAt} action={setContentArchivedAction.bind(null, c.id)} label="item" />
          )
        }
      />
      <Card>
        <CardContent className="pt-5">
          {canEdit ? (
            <ContentForm
              action={updateContentAction.bind(null, c.id)}
              practiceAreas={practiceAreas}
              submitLabel="Save changes"
              defaults={{
                title: c.title,
                type: c.type,
                channel: c.channel ?? "",
                status: c.status,
                publishDate: c.publishDate ? c.publishDate.toISOString().slice(0, 10) : "",
                url: c.url ?? "",
                engagementNotes: c.engagementNotes ?? "",
                authors: c.authors.map((a) => ({ id: a.id, label: a.name })),
                practiceAreaIds: c.practiceAreas.map((p) => p.id),
              }}
            />
          ) : (
            <DetailList
              items={[
                { label: "Authors", value: c.authors.map((a) => a.name).join(", ") },
                { label: "Channel", value: c.channel },
                { label: "Publish date", value: formatDateOnly(c.publishDate) },
                {
                  label: "Link",
                  value: c.url && (
                    <a href={c.url} className="text-primary hover:underline">
                      {c.url}
                    </a>
                  ),
                },
                { label: "Engagement", value: c.engagementNotes },
              ]}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
