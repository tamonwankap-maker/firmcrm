import type { Metadata } from "next";
import { requirePageRole } from "@/server/auth/page-guards";
import { listPracticeAreaOptions } from "@/features/users/queries";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { NewUserForm } from "./new-user-form";

export const metadata: Metadata = { title: "Add user" };

export default async function NewUserPage() {
  await requirePageRole("ADMIN");
  const practiceAreas = await listPracticeAreaOptions();
  return (
    <div className="max-w-3xl">
      <PageHeader title="Add user" />
      <Card>
        <CardContent className="pt-5">
          <NewUserForm practiceAreas={practiceAreas} />
        </CardContent>
      </Card>
    </div>
  );
}
