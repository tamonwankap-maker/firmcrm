import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { requireUser } from "@/server/auth/current-user";
import { can } from "@/server/auth/policy";
import { getMatter } from "@/features/matters/queries";
import { matterFacts } from "@/features/matters/facts";
import { updateMatterAction } from "@/features/matters/actions";
import { MatterForm } from "@/features/matters/components/matter-form";
import { matterToFormValues } from "@/features/matters/defaults";
import { practiceAreaOptions } from "@/features/lookups/options";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";

export const metadata: Metadata = { title: "Edit matter" };

export default async function EditMatterPage(props: PageProps<"/matters/[id]/edit">) {
  const me = await requireUser();
  const { id } = await props.params;
  const m = await getMatter(me, id);
  if (!m) notFound();
  if (!can(me, "update", "RepresentativeMatter", matterFacts(m))) redirect("/no-access");
  const practiceAreas = await practiceAreaOptions();
  return (
    <div className="max-w-4xl">
      <PageHeader title={`Edit ${m.title}`} />
      <Card>
        <CardContent className="pt-5">
          <MatterForm
            action={updateMatterAction.bind(null, m.id)}
            defaults={matterToFormValues(m)}
            practiceAreas={practiceAreas}
            submitLabel="Save changes"
          />
        </CardContent>
      </Card>
    </div>
  );
}
