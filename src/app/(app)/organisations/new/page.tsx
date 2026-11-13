import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireUser } from "@/server/auth/current-user";
import { can } from "@/server/auth/policy";
import { listIndustryOptions } from "@/features/organisations/queries";
import { createOrganisationAction } from "@/features/organisations/actions";
import { OrganisationForm } from "@/features/organisations/components/organisation-form";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { countryOptions } from "@/lib/countries";

export const metadata: Metadata = { title: "New organisation" };

export default async function NewOrganisationPage() {
  const me = await requireUser();
  if (!can(me, "create", "Organisation")) redirect("/no-access");
  const industries = await listIndustryOptions();
  return (
    <div className="max-w-4xl">
      <PageHeader title="New organisation" />
      <Card>
        <CardContent className="pt-5">
          <OrganisationForm
            action={createOrganisationAction}
            industries={industries}
            countries={countryOptions()}
            submitLabel="Create organisation"
            defaults={{
              nameEn: "",
              nameTh: "",
              type: "",
              status: "ACTIVE",
              industryId: "",
              country: "TH",
              relationshipPartner: me.role === "PARTNER" ? { id: me.id, label: me.name } : null,
              isKeyClient: false,
              website: "",
              notes: "",
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
}
