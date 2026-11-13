import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireUser } from "@/server/auth/current-user";
import { can } from "@/server/auth/policy";
import { createMatterAction } from "@/features/matters/actions";
import { MatterForm } from "@/features/matters/components/matter-form";
import { emptyMatter } from "@/features/matters/defaults";
import { practiceAreaOptions } from "@/features/lookups/options";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { todayInBangkok } from "@/lib/dates";

export const metadata: Metadata = { title: "New matter" };

export default async function NewMatterPage() {
  const me = await requireUser();
  if (!can(me, "create", "RepresentativeMatter")) redirect("/no-access");
  const practiceAreas = await practiceAreaOptions();
  const defaults = { ...emptyMatter(todayInBangkok().getUTCFullYear()), team: [{ id: me.id, label: me.name }] };
  return (
    <div className="max-w-4xl">
      <PageHeader title="New representative matter" />
      <Card>
        <CardContent className="pt-5">
          <MatterForm
            action={createMatterAction}
            defaults={defaults}
            practiceAreas={practiceAreas}
            submitLabel="Create matter"
          />
        </CardContent>
      </Card>
    </div>
  );
}
