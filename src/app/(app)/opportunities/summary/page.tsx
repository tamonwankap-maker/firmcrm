import type { Metadata } from "next";
import { Lock } from "lucide-react";
import { requireUser } from "@/server/auth/current-user";
import { can } from "@/server/auth/policy";
import { redirect } from "next/navigation";
import { pipelineSummary } from "@/features/opportunities/queries";
import { getSettings } from "@/features/settings/queries";
import { OPP_SOURCE_LABELS, OUTCOME_REASON_LABELS, STAGE_LABELS } from "@/features/labels";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatMoney, formatThbCompact } from "@/lib/money";

export const metadata: Metadata = { title: "Pipeline summary" };

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="bg-card rounded-lg border p-4">
      <div className="text-muted-foreground text-xs font-medium tracking-wide uppercase">{label}</div>
      <div className="mt-1 text-2xl font-semibold tabular-nums">{value}</div>
      {sub && <div className="text-muted-foreground text-xs">{sub}</div>}
    </div>
  );
}

function Bar({ value, max }: { value: number; max: number }) {
  const pct = max > 0 ? Math.max(2, Math.round((value / max) * 100)) : 0;
  return (
    <div className="bg-muted h-2 w-full rounded" aria-hidden>
      <div className="bg-primary h-2 rounded" style={{ width: `${pct}%` }} />
    </div>
  );
}

export default async function PipelineSummaryPage() {
  const me = await requireUser();
  if (!can(me, "read", "PipelineSummary")) redirect("/no-access");
  const settings = await getSettings();
  const s = await pipelineSummary(settings.usdToThbRate);
  const maxStage = Math.max(...s.byStage.map((r) => r.weightedThb));
  const maxPractice = Math.max(0, ...s.byPracticeArea.map((r) => r.weightedThb));

  return (
    <>
      <PageHeader
        title="Pipeline summary"
        description={`Firm-wide, read-only. Values in THB (USD at ${settings.usdToThbRate}). Weighted = fee estimate × win probability.`}
      />
      {s.totals.confidentialOpen > 0 && (
        <p className="text-muted-foreground mb-4 inline-flex items-center gap-1.5 text-sm">
          <Lock className="size-3.5" /> Totals include {s.totals.confidentialOpen} confidential{" "}
          {s.totals.confidentialOpen === 1 ? "opportunity" : "opportunities"}, shown only as numbers.
        </p>
      )}
      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat
          label="Open opportunities"
          value={String(s.totals.openCount)}
          sub={s.totals.onHold ? `+ ${s.totals.onHold} on hold` : undefined}
        />
        <Stat
          label="Weighted pipeline"
          value={formatThbCompact(s.totals.weightedThb)}
          sub={`${formatThbCompact(s.totals.valueThb)} unweighted`}
        />
        <Stat label={`Won in ${s.yearLabel}`} value={String(s.year.won)} sub={formatThbCompact(s.year.wonValueThb)} />
        <Stat
          label={`Win rate ${s.yearLabel}`}
          value={s.year.winRate == null ? "—" : `${s.year.winRate}%`}
          sub={`${s.year.won} won · ${s.year.lost} lost`}
        />
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>By stage</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>Stage</TableHead>
                  <TableHead className="text-right">Count</TableHead>
                  <TableHead className="text-right">Weighted</TableHead>
                  <TableHead className="w-1/3" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {s.byStage.map((r) => (
                  <TableRow key={r.stage}>
                    <TableCell>{STAGE_LABELS[r.stage]}</TableCell>
                    <TableCell className="text-right tabular-nums">{r.count}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatMoney(Math.round(r.weightedThb), "THB")}
                    </TableCell>
                    <TableCell>
                      <Bar value={r.weightedThb} max={maxStage} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>By practice area (weighted)</CardTitle>
          </CardHeader>
          <CardContent>
            {s.byPracticeArea.length === 0 ? (
              <p className="text-muted-foreground text-sm">No open opportunities.</p>
            ) : (
              <ul className="flex flex-col gap-2.5 text-sm">
                {s.byPracticeArea.map((r) => (
                  <li key={r.name} className="grid grid-cols-[1fr_auto] items-center gap-x-3 gap-y-1">
                    <span>
                      {r.name} <span className="text-muted-foreground text-xs">({r.count})</span>
                    </span>
                    <span className="text-right tabular-nums">{formatThbCompact(r.weightedThb)}</span>
                    <div className="col-span-2">
                      <Bar value={r.weightedThb} max={maxPractice} />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Sources ({s.yearLabel} outcomes)</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>Source</TableHead>
                  <TableHead className="text-right">Open</TableHead>
                  <TableHead className="text-right">Won</TableHead>
                  <TableHead className="text-right">Lost</TableHead>
                  <TableHead className="text-right">Win rate</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {s.bySource.map((r) => (
                  <TableRow key={r.source}>
                    <TableCell>{OPP_SOURCE_LABELS[r.source]}</TableCell>
                    <TableCell className="text-right tabular-nums">{r.open}</TableCell>
                    <TableCell className="text-right tabular-nums">{r.won}</TableCell>
                    <TableCell className="text-right tabular-nums">{r.lost}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {r.winRate == null ? "—" : `${r.winRate}%`}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Why we lost ({s.yearLabel})</CardTitle>
          </CardHeader>
          <CardContent>
            {s.lossReasons.length === 0 ? (
              <p className="text-muted-foreground text-sm">No losses recorded this year.</p>
            ) : (
              <ul className="flex flex-col gap-2 text-sm">
                {s.lossReasons.map((r) => (
                  <li key={r.reason} className="flex justify-between">
                    <span>{OUTCOME_REASON_LABELS[r.reason]}</span>
                    <span className="tabular-nums">{r.count}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
