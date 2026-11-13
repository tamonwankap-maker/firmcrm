import type { Metadata } from "next";
import { requirePageRole } from "@/server/auth/page-guards";
import { PageHeader } from "@/components/layout/page-header";
import { ImportWizard } from "./import-wizard";

export const metadata: Metadata = { title: "Import" };

export default async function ImportPage(props: PageProps<"/import">) {
  await requirePageRole("ADMIN", "BD");
  const sp = await props.searchParams;
  return (
    <div className="max-w-4xl">
      <PageHeader
        title="Import from Excel / CSV"
        description="Upload a spreadsheet, check the preview, then import. Duplicates are skipped automatically and every record is audited."
      />
      <ImportWizard initialKind={sp.type === "contacts" ? "contacts" : "organisations"} />
    </div>
  );
}
