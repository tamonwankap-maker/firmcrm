import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { requireUser } from "@/server/auth/current-user";
import { can } from "@/server/auth/policy";
import { db } from "@/server/db";
import { listIndustryOptions } from "@/features/organisations/queries";
import { organisationFacts } from "@/features/organisations/facts";
import { updateOrganisationAction } from "@/features/organisations/actions";
import { OrganisationForm } from "@/features/organisations/components/organisation-form";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { countryOptions } from "@/lib/countries";

export const metadata: Metadata = { title: "Edit organisation" };

export default async function EditOrganisationPage(props: PageProps<"/organisations/[id]/edit">) {
  const me = await requireUser();
  const { id } = await props.params;
  const org = await db.organisation.findUnique({
    where: { id },
    include: { relationshipPartner: { select: { id: true, name: true } } },
  });
  if (!org) notFound();
  if (!can(me, "update", "Organisation", organisationFacts(org))) redirect("/no-access");
  const industries = await listIndustryOptions();
  return (
    <div className="max-w-4xl">
      <PageHeader title={`Edit ${org.nameEn}`} />
      <Card>
        <CardContent className="pt-5">
          <OrganisationForm
            action={updateOrganisationAction.bind(null, org.id)}
            industries={industries}
            countries={countryOptions()}
            submitLabel="Save changes"
            defaults={{
              nameEn: org.nameEn,
              nameTh: org.nameTh ?? "",
              type: org.type,
              status: org.status,
              industryId: org.industryId ?? "",
              country: org.country,
              relationshipPartner: org.relationshipPartner
                ? { id: org.relationshipPartner.id, label: org.relationshipPartner.name }
                : null,
              isKeyClient: org.isKeyClient,
              website: org.website ?? "",
              notes: org.notes ?? "",
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
}
