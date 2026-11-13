import type { Metadata } from "next";
import { requirePageRole } from "@/server/auth/page-guards";
import { listAllLookups } from "@/features/lookups/queries";
import { LOOKUP_KINDS, LOOKUP_LABELS } from "@/features/lookups/schema";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LookupEditor } from "./lookup-editor";

export const metadata: Metadata = { title: "Lists" };

export default async function ListsPage() {
  await requirePageRole("ADMIN");
  const lookups = await listAllLookups();
  return (
    <>
      <PageHeader
        title="Lists"
        description="Drop-down values used across the CRM. Items are deactivated rather than deleted, so old records keep their labels."
      />
      <div className="grid gap-6 xl:grid-cols-3">
        {LOOKUP_KINDS.map((kind) => (
          <Card key={kind}>
            <CardHeader>
              <CardTitle>{LOOKUP_LABELS[kind].title}</CardTitle>
            </CardHeader>
            <CardContent>
              <LookupEditor kind={kind} items={lookups[kind]} singular={LOOKUP_LABELS[kind].singular} />
            </CardContent>
          </Card>
        ))}
      </div>
    </>
  );
}
