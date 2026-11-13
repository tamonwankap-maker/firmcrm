import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { requireUser } from "@/server/auth/current-user";
import { can } from "@/server/auth/policy";
import { getOpportunityDetail } from "@/features/opportunities/queries";
import { opportunityFacts } from "@/features/opportunities/facts";
import { updateOpportunityAction } from "@/features/opportunities/actions";
import { OpportunityForm } from "@/features/opportunities/components/opportunity-form";
import { opportunityToFormValues } from "@/features/opportunities/defaults";
import { practiceAreaOptions } from "@/features/lookups/options";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";

export const metadata: Metadata = { title: "Edit opportunity" };

export default async function EditOpportunityPage(props: PageProps<"/opportunities/[id]/edit">) {
  const me = await requireUser();
  const { id } = await props.params;
  const o = await getOpportunityDetail(me, id);
  if (!o) notFound();
  if (!can(me, "update", "Opportunity", opportunityFacts(o))) redirect("/no-access");
  const practiceAreas = await practiceAreaOptions();
  return (
    <div className="max-w-4xl">
      <PageHeader
        title={`Edit ${o.name}`}
        description="To change the stage, use “Change stage” on the opportunity page."
      />
      <Card>
        <CardContent className="pt-5">
          <OpportunityForm
            mode="edit"
            action={updateOpportunityAction.bind(null, o.id)}
            defaults={opportunityToFormValues(o)}
            practiceAreas={practiceAreas}
          />
        </CardContent>
      </Card>
    </div>
  );
}
