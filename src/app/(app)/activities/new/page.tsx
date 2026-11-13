import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireUser } from "@/server/auth/current-user";
import { can } from "@/server/auth/policy";
import { createActivityAction } from "@/features/activities/actions";
import { ActivityForm } from "@/features/activities/components/activity-form";
import { newActivityDefaults } from "@/features/activities/defaults";
import { practiceAreaOptions } from "@/features/lookups/options";
import { db } from "@/server/db";
import { opportunityVisibleWhere } from "@/server/auth/visibility";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";

export const metadata: Metadata = { title: "Log activity" };

const str = (v: string | string[] | undefined) => (typeof v === "string" && v ? v : undefined);

export default async function NewActivityPage(props: PageProps<"/activities/new">) {
  const me = await requireUser();
  if (!can(me, "create", "Activity")) redirect("/no-access");
  const sp = await props.searchParams;
  const oppId = str(sp.opportunity);
  const opportunity = oppId
    ? await db.opportunity.findFirst({
        where: { AND: [{ id: oppId }, opportunityVisibleWhere(me)] },
        select: { id: true, name: true, organisation: { select: { id: true, nameEn: true } } },
      })
    : null;
  const [defaults, practiceAreas] = await Promise.all([
    newActivityDefaults(me, str(sp.org), str(sp.contact), opportunity),
    practiceAreaOptions(),
  ]);
  return (
    <div className="max-w-4xl">
      <PageHeader title="Log activity" description="Meetings, calls, lunches, referrals, gifts…" />
      <Card>
        <CardContent className="pt-5">
          <ActivityForm
            action={createActivityAction}
            defaults={defaults}
            practiceAreas={practiceAreas}
            submitLabel="Save activity"
            returnTo={str(sp.returnTo)}
          />
        </CardContent>
      </Card>
    </div>
  );
}
