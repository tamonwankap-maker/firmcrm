import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { requireUser } from "@/server/auth/current-user";
import { can } from "@/server/auth/policy";
import { getActivity } from "@/features/activities/queries";
import { activityFacts } from "@/features/activities/facts";
import { setActivityArchivedAction, updateActivityAction } from "@/features/activities/actions";
import { ActivityForm } from "@/features/activities/components/activity-form";
import { activityToFormValues } from "@/features/activities/defaults";
import { practiceAreaOptions } from "@/features/lookups/options";
import { PageHeader } from "@/components/layout/page-header";
import { ArchiveButton } from "@/components/records/archive-button";
import { Card, CardContent } from "@/components/ui/card";

export const metadata: Metadata = { title: "Edit activity" };

export default async function EditActivityPage(props: PageProps<"/activities/[id]/edit">) {
  const me = await requireUser();
  const { id } = await props.params;
  const sp = await props.searchParams;
  const a = await getActivity(me, id);
  if (!a) notFound();
  if (!can(me, "update", "Activity", activityFacts(a))) redirect("/no-access");
  const practiceAreas = await practiceAreaOptions();
  return (
    <div className="max-w-4xl">
      <PageHeader
        title="Edit activity"
        actions={
          <ArchiveButton
            archived={!!a.archivedAt}
            action={setActivityArchivedAction.bind(null, a.id)}
            label="activity"
          />
        }
      />
      <Card>
        <CardContent className="pt-5">
          <ActivityForm
            action={updateActivityAction.bind(null, a.id)}
            defaults={activityToFormValues(a)}
            practiceAreas={practiceAreas}
            submitLabel="Save changes"
            returnTo={typeof sp.returnTo === "string" ? sp.returnTo : undefined}
          />
        </CardContent>
      </Card>
    </div>
  );
}
