/**
 * Firm-wide pipeline aggregation (pure; unit-tested).
 * Includes confidential opportunities in totals but never exposes their names.
 */
import type { CurrencyCode } from "@/lib/money";
import {
  ACTIVE_STAGES,
  OPP_SOURCES,
  OUTCOME_REASONS,
  type OppSourceKey,
  type OutcomeReasonKey,
  type StageKey,
} from "../labels";
import { feeEstimate, weightedValueThb, winRate } from "./rules";
import { toThb } from "@/lib/money";

export interface SummaryInput {
  stage: StageKey;
  source: OppSourceKey;
  confidential: boolean;
  feeEstimateMin: { toString(): string } | null;
  feeEstimateMax: { toString(): string } | null;
  currency: CurrencyCode;
  probability: number;
  closedDate: Date | null;
  outcomeReason: OutcomeReasonKey | null;
  practiceAreas: { name: string }[];
}

export interface StageRow {
  stage: StageKey;
  count: number;
  valueThb: number;
  weightedThb: number;
}

export function summarisePipeline(opps: SummaryInput[], usdToThbRate: number, yearStart: Date) {
  const value = (o: SummaryInput) => {
    const f = feeEstimate(o.feeEstimateMin, o.feeEstimateMax);
    return f == null ? 0 : toThb(f, o.currency, usdToThbRate);
  };
  const open = opps.filter((o) => (ACTIVE_STAGES as readonly string[]).includes(o.stage));
  const byStage: StageRow[] = ACTIVE_STAGES.map((stage) => {
    const rows = open.filter((o) => o.stage === stage);
    return {
      stage,
      count: rows.length,
      valueThb: rows.reduce((s, o) => s + value(o), 0),
      weightedThb: rows.reduce((s, o) => s + weightedValueThb(o, usdToThbRate), 0),
    };
  });

  const practice = new Map<string, { count: number; weightedThb: number }>();
  for (const o of open) {
    // Split weighted value evenly across the opportunity's practice areas.
    const share = o.practiceAreas.length ? 1 / o.practiceAreas.length : 1;
    for (const pa of o.practiceAreas.length ? o.practiceAreas : [{ name: "Unassigned" }]) {
      const cur = practice.get(pa.name) ?? { count: 0, weightedThb: 0 };
      cur.count += 1;
      cur.weightedThb += weightedValueThb(o, usdToThbRate) * share;
      practice.set(pa.name, cur);
    }
  }

  const closedThisYear = opps.filter(
    (o) => o.closedDate && o.closedDate >= yearStart && (o.stage === "WON" || o.stage === "LOST"),
  );
  const won = closedThisYear.filter((o) => o.stage === "WON");
  const lost = closedThisYear.filter((o) => o.stage === "LOST");

  const bySource = OPP_SOURCES.map((source) => {
    const w = won.filter((o) => o.source === source).length;
    const l = lost.filter((o) => o.source === source).length;
    return { source, won: w, lost: l, open: open.filter((o) => o.source === source).length, winRate: winRate(w, l) };
  }).filter((r) => r.won + r.lost + r.open > 0);

  const lossReasons = OUTCOME_REASONS.map((reason) => ({
    reason,
    count: lost.filter((o) => o.outcomeReason === reason).length,
  })).filter((r) => r.count > 0);

  return {
    byStage,
    totals: {
      openCount: open.length,
      valueThb: byStage.reduce((s, r) => s + r.valueThb, 0),
      weightedThb: byStage.reduce((s, r) => s + r.weightedThb, 0),
      confidentialOpen: open.filter((o) => o.confidential).length,
      onHold: opps.filter((o) => o.stage === "ON_HOLD").length,
    },
    byPracticeArea: [...practice.entries()]
      .map(([name, v]) => ({ name, ...v }))
      .sort((a, b) => b.weightedThb - a.weightedThb),
    year: {
      won: won.length,
      lost: lost.length,
      wonValueThb: won.reduce((s, o) => s + value(o), 0),
      winRate: winRate(won.length, lost.length),
    },
    bySource,
    lossReasons,
  };
}
export type PipelineSummary = ReturnType<typeof summarisePipeline>;
