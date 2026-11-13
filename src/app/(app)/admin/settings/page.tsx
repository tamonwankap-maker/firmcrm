import type { Metadata } from "next";
import { requirePageRole } from "@/server/auth/page-guards";
import { getSettings } from "@/features/settings/queries";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { SettingsForm } from "./settings-form";

export const metadata: Metadata = { title: "Settings" };

export default async function SettingsPage() {
  await requirePageRole("ADMIN");
  const settings = await getSettings();
  return (
    <div className="max-w-2xl">
      <PageHeader title="Settings" />
      <Card>
        <CardContent className="pt-5">
          <SettingsForm settings={settings} />
        </CardContent>
      </Card>
    </div>
  );
}
