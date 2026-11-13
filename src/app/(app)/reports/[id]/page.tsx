import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, FileSpreadsheet, FileText } from "lucide-react";
import { requirePageRole } from "@/server/auth/page-guards";
import { getReport } from "@/features/reports/registry";
import { parseReportParams } from "@/features/reports/params";
import { runReport } from "@/features/reports/run";
import { ReportChart } from "@/features/reports/components/report-chart";
import { ReportTable } from "@/features/reports/components/report-table";
import { practiceAreaOptions } from "@/features/lookups/options";
import { MAILING_LISTS, MAILING_LIST_LABELS } from "@/features/labels";
import { PageHeader } from "@/components/layout/page-header";
import { FilterBar, FilterField } from "@/components/layout/filter-bar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";

export async function generateMetadata(props: PageProps<"/reports/[id]">): Promise<Metadata> {
  const { id } = await props.params;
  return { title: getReport(id)?.title ?? "Report" };
}

export default async function ReportPage(props: PageProps<"/reports/[id]">) {
  const me = await requirePageRole("ADMIN", "BD", "PARTNER");
  const { id } = await props.params;
  const def = getReport(id);
  if (!def) notFound();
  if (!def.roles.includes(me.role)) redirect("/no-access");
  const params = parseReportParams(await props.searchParams);
  const [ran, practices] = await Promise.all([
    runReport(me, id, params),
    def.params.includes("practice") ? practiceAreaOptions() : [],
  ]);
  if (!ran) notFound();
  const { result } = ran;
  const exportHref = (format: "xlsx" | "pdf") =>
    `/api/export/${def.id}?format=${format}${ran.query ? `&${ran.query}` : ""}`;

  return (
    <>
      <Link
        href="/reports"
        className="text-muted-foreground hover:text-foreground mb-2 inline-flex items-center gap-1 text-sm"
      >
        <ArrowLeft className="size-4" /> Reports
      </Link>
      <PageHeader
        title={def.title}
        description={ran.subtitle || def.description}
        actions={
          <>
            <Button asChild variant="outline">
              <a href={exportHref("xlsx")} download>
                <FileSpreadsheet /> Excel
              </a>
            </Button>
            <Button asChild variant="outline">
              <a href={exportHref("pdf")} download>
                <FileText /> PDF
              </a>
            </Button>
          </>
        }
      />
      {def.params.length > 0 && (
        <FilterBar resetHref={`/reports/${def.id}`}>
          {def.params.includes("dateRange") && (
            <>
              <FilterField label="From" htmlFor="filter-from">
                <Input id="filter-from" name="from" type="date" defaultValue={params.from.toISOString().slice(0, 10)} />
              </FilterField>
              <FilterField label="To" htmlFor="filter-to">
                <Input id="filter-to" name="to" type="date" defaultValue={params.to.toISOString().slice(0, 10)} />
              </FilterField>
            </>
          )}
          {def.params.includes("year") && (
            <FilterField label="Guide year" htmlFor="filter-year">
              <Input
                id="filter-year"
                name="year"
                type="number"
                min={2000}
                max={2100}
                defaultValue={params.year}
                className="w-28"
              />
            </FilterField>
          )}
          {def.params.includes("practice") && (
            <FilterField label="Practice area" htmlFor="filter-practice">
              <NativeSelect id="filter-practice" name="practice" defaultValue={params.practice ?? ""}>
                <option value="">All</option>
                {practices.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </NativeSelect>
            </FilterField>
          )}
          {def.params.includes("list") && (
            <FilterField label="Mailing list" htmlFor="filter-list">
              <NativeSelect id="filter-list" name="list" defaultValue={params.list}>
                {MAILING_LISTS.map((l) => (
                  <option key={l} value={l}>
                    {MAILING_LIST_LABELS[l]}
                  </option>
                ))}
              </NativeSelect>
            </FilterField>
          )}
        </FilterBar>
      )}
      {result.highlights && (
        <div className="mb-4 flex flex-wrap gap-3">
          {result.highlights.map((h) => (
            <div key={h.label} className="bg-card rounded-lg border px-4 py-2">
              <div className="text-muted-foreground text-[11px] font-medium tracking-wide uppercase">{h.label}</div>
              <div className="text-lg font-semibold tabular-nums">{h.value}</div>
            </div>
          ))}
        </div>
      )}
      {result.chart && (
        <Card className="mb-4">
          <CardContent className="pt-5">
            <ReportChart spec={result.chart} title={def.title} />
          </CardContent>
        </Card>
      )}
      <ReportTable result={result} />
      {result.notes && (
        <ul className="text-muted-foreground mt-3 flex flex-col gap-1 text-xs">
          {result.notes.map((n) => (
            <li key={n}>{n}</li>
          ))}
        </ul>
      )}
    </>
  );
}
