import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireUser } from "@/server/auth/current-user";
import { can } from "@/server/auth/policy";
import { db } from "@/server/db";
import { createOpportunityAction } from "@/features/opportunities/actions";
import { OpportunityForm } from "@/features/opportunities/components/opportunity-form";
import { newOpportunityDefaults } from "@/features/opportunities/defaults";
import { practiceAreaOptions } from "@/features/lookups/options";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";

export const metadata: Metadata = { title: "New opportunity" };

export default async function NewOpportunityPage(props: PageProps<"/opportunities/new">) {
  const me = await requireUser();
  if (!can(me, "create", "Opportunity")) redirect("/no-access");
  const sp = await props.searchParams;
  const orgId = typeof sp.org === "string" ? sp.org : undefined;
  const [org, practiceAreas] = await Promise.all([
    orgId ? db.organisation.findUnique({ where: { id: orgId }, select: { id: true, nameEn: true } }) : null,
    practiceAreaOptions(),
  ]);
  return (
    <div className="max-w-4xl">
      <PageHeader title="New opportunity" />
      <Card>
        <CardContent className="pt-5">
          <OpportunityForm
            mode="create"
            action={createOpportunityAction}
            defaults={newOpportunityDefaults(me, org)}
            practiceAreas={practiceAreas}
          />
        </CardContent>
      </Card>
    </div>
  );
}
