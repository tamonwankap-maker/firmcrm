import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireUser } from "@/server/auth/current-user";
import { can } from "@/server/auth/policy";
import { db } from "@/server/db";
import { createClientPlanAction } from "@/features/client-plans/actions";
import { ClientPlanForm } from "@/features/client-plans/components/client-plan-form";
import { practiceAreaOptions } from "@/features/lookups/options";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { todayInBangkok } from "@/lib/dates";

export const metadata: Metadata = { title: "New client plan" };

export default async function NewClientPlanPage(props: PageProps<"/client-plans/new">) {
  const me = await requireUser();
  if (!can(me, "create", "ClientPlan")) redirect("/no-access");
  const sp = await props.searchParams;
  const orgId = typeof sp.org === "string" ? sp.org : undefined;
  const [org, practiceAreas] = await Promise.all([
    orgId ? db.organisation.findUnique({ where: { id: orgId }, select: { id: true, nameEn: true } }) : null,
    practiceAreaOptions(),
  ]);
  return (
    <div className="max-w-4xl">
      <PageHeader title="New client plan" description="One plan per client per year." />
      <Card>
        <CardContent className="pt-5">
          <ClientPlanForm
            mode="create"
            action={createClientPlanAction}
            practiceAreas={practiceAreas}
            defaults={{
              organisation: org ? { id: org.id, label: org.nameEn } : null,
              year: String(todayInBangkok().getUTCFullYear()),
              objectives: "",
              crossSellTargetIds: [],
              reviewMeetingDate: "",
              healthScore: 3,
              owner: { id: me.id, label: me.name },
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
}
