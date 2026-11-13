import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireUser } from "@/server/auth/current-user";
import { can } from "@/server/auth/policy";
import { createSubmissionAction } from "@/features/rankings/actions";
import { SubmissionForm } from "@/features/rankings/components/submission-form";
import { directoryOptions } from "@/features/lookups/directory-options";
import { practiceAreaOptions } from "@/features/lookups/options";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { todayInBangkok } from "@/lib/dates";

export const metadata: Metadata = { title: "New submission" };

export default async function NewSubmissionPage() {
  const me = await requireUser();
  if (!can(me, "create", "DirectorySubmission")) redirect("/no-access");
  const [directories, practiceAreas] = await Promise.all([directoryOptions(), practiceAreaOptions()]);
  return (
    <div className="max-w-4xl">
      <PageHeader
        title="New directory submission"
        description="One submission per directory, guide year and practice area."
      />
      <Card>
        <CardContent className="pt-5">
          <SubmissionForm
            mode="create"
            action={createSubmissionAction}
            directories={directories}
            practiceAreas={practiceAreas}
            defaults={{
              directoryId: "",
              year: String(todayInBangkok().getUTCFullYear() + 1),
              practiceAreaId: "",
              deadline: "",
              owner: { id: me.id, label: me.name },
              partnerReviewer: null,
              status: "PLANNING",
              resultTier: "",
              rankedLawyers: [],
              matters: [],
              notes: "",
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
}
