import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireUser } from "@/server/auth/current-user";
import { can } from "@/server/auth/policy";
import { createEventAction } from "@/features/events/actions";
import { EventForm } from "@/features/events/components/event-form";
import { newEventDefaults } from "@/features/events/defaults";
import { practiceAreaOptions } from "@/features/lookups/options";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";

export const metadata: Metadata = { title: "New event" };

export default async function NewEventPage() {
  const me = await requireUser();
  if (!can(me, "create", "Event")) redirect("/no-access");
  const practiceAreas = await practiceAreaOptions();
  return (
    <div className="max-w-4xl">
      <PageHeader title="New event" />
      <Card>
        <CardContent className="pt-5">
          <EventForm
            action={createEventAction}
            defaults={newEventDefaults(me)}
            practiceAreas={practiceAreas}
            submitLabel="Create event"
          />
        </CardContent>
      </Card>
    </div>
  );
}
