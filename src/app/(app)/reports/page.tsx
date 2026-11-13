import type { Metadata } from "next";
import Link from "next/link";
import { FileBarChart, Lock } from "lucide-react";
import { requirePageRole } from "@/server/auth/page-guards";
import { reportsFor } from "@/features/reports/registry";
import { firmOverview } from "@/features/reports/overview";
import { ReportChart } from "@/features/reports/components/report-chart";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatThbCompact } from "@/lib/money";

export const metadata: Metadata = { title: "Reports" };

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="bg-card rounded-lg border p-4">
      <div className="text-muted-foreground text-xs font-medium tracking-wide uppercase">{label}</div>
      <div className="mt-1 text-2xl font-semibold tabular-nums">{value}</div>
      {sub && <div className="text-muted-foreground text-xs">{sub}</div>}
    </div>
  );
}

export default async function ReportsPage() {
  const me = await requirePageRole("ADMIN", "BD", "PARTNER");
  const reports = reportsFor(me.role);
  const overview = me.role === "ADMIN" || me.role === "BD" ? await firmOverview(me) : null;

  return (
    <>
      <PageHeader
        title="Reports"
        description="Run a report on screen, then export it to Excel or PDF. Every export is recorded in the audit log."
      />
      {overview && (
        <section aria-labelledby="overview-heading" className="mb-8">
          <h2 id="overview-heading" className="mb-3 text-lg font-semibold">
            Firm overview
          </h2>
          <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Stat label="Open opportunities" value={String(overview.summary.totals.openCount)} />
            <Stat
              label="Weighted pipeline"
              value={formatThbCompact(overview.summary.totals.weightedThb)}
              sub={`${formatThbCompact(overview.summary.totals.valueThb)} unweighted`}
            />
            <Stat
              label={`Won ${overview.year}`}
              value={String(overview.summary.year.won)}
              sub={formatThbCompact(overview.summary.year.wonValueThb)}
            />
            <Stat
              label={`Win rate ${overview.year}`}
              value={overview.summary.year.winRate == null ? "—" : `${overview.summary.year.winRate}%`}
            />
          </div>
          {overview.summary.totals.confidentialOpen > 0 && (
            <p className="text-muted-foreground mb-3 inline-flex items-center gap-1.5 text-xs">
              <Lock className="size-3" /> Pipeline figures include {overview.summary.totals.confidentialOpen}{" "}
              confidential opportunity(ies).
            </p>
          )}
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Weighted pipeline by stage</CardTitle>
              </CardHeader>
              <CardContent>
                <ReportChart spec={overview.pipelineByStage} title="Weighted pipeline by stage" />
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Won and lost by quarter</CardTitle>
              </CardHeader>
              <CardContent>
                <ReportChart spec={overview.winLoss} title="Won and lost by quarter" />
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Client activity, last 6 months</CardTitle>
              </CardHeader>
              <CardContent>
                <ReportChart spec={overview.activity} title="Client activity by month and type" />
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Weighted pipeline by practice area</CardTitle>
              </CardHeader>
              <CardContent>
                <ReportChart spec={overview.pipelineByPractice} title="Weighted pipeline by practice area" />
              </CardContent>
            </Card>
          </div>
        </section>
      )}
      <section aria-labelledby="reports-heading">
        <h2 id="reports-heading" className="mb-3 text-lg font-semibold">
          Reports
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {reports.map((r) => (
            <Link key={r.id} href={`/reports/${r.id}`} className="group">
              <Card className="group-hover:bg-accent h-full transition-colors">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileBarChart className="text-muted-foreground size-4" aria-hidden /> {r.title}
                  </CardTitle>
                  <CardDescription>{r.description}</CardDescription>
                </CardHeader>
              </Card>
            </Link>
          ))}
        </div>
      </section>
    </>
  );
}
