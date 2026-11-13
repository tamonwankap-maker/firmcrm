import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireUser } from "@/server/auth/current-user";
import { can } from "@/server/auth/policy";
import { db } from "@/server/db";
import { opportunityVisibleWhere } from "@/server/auth/visibility";
import { createPitchAction } from "@/features/pitches/actions";
import { PitchForm } from "@/features/pitches/components/pitch-form";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { bangkokInputDaysFromNow } from "@/lib/dates";
import { STANDARD_PITCH_CHECKLIST } from "@/features/labels";

export const metadata: Metadata = { title: "New pitch" };

export default async function NewPitchPage(props: PageProps<"/pitches/new">) {
  const me = await requireUser();
  if (!can(me, "create", "Pitch")) redirect("/no-access");
  const sp = await props.searchParams;
  const oppId = typeof sp.opportunity === "string" ? sp.opportunity : undefined;
  const opp = oppId
    ? await db.opportunity.findFirst({
        where: { AND: [{ id: oppId }, opportunityVisibleWhere(me)] },
        select: { id: true, name: true },
      })
    : null;
  const deadline = bangkokInputDaysFromNow(7); // default: one week out, 17:00 Bangkok
  return (
    <div className="max-w-3xl">
      <PageHeader
        title="New pitch"
        description={`A checklist is created automatically: ${STANDARD_PITCH_CHECKLIST.join(", ")}.`}
      />
      <Card>
        <CardContent className="pt-5">
          <PitchForm
            mode="create"
            action={createPitchAction}
            defaults={{
              opportunity: opp ? { id: opp.id, label: opp.name } : null,
              deadline,
              owner: { id: me.id, label: me.name },
              format: "WRITTEN",
              status: "DRAFTING",
              notes: "",
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
}
