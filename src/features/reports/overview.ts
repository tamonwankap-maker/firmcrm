import "server-only";
import { db } from "@/server/db";
import { activityVisibleWhere, opportunityVisibleWhere } from "@/server/auth/visibility";
import type { Actor } from "@/server/auth/policy";
import { todayInBangkok } from "@/lib/dates";
import { pipelineSummary } from "../opportunities/queries";
import { getSettings } from "../settings/queries";
import { ACTIVITY_TYPES, ACTIVITY_TYPE_LABELS, STAGE_LABELS } from "../labels";
import type { ChartSpec } from "./types";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** Head-of-BD overview charts. Pipeline totals include confidential deals as numbers only. */
export async function firmOverview(actor: Actor) {
  const settings = await getSettings();
  const today = todayInBangkok();
  const year = today.getUTCFullYear();
  const summary = await pipelineSummary(settings.usdToThbRate);

  const pipelineByStage: ChartSpec = {
    kind: "bar",
    xKey: "stage",
    series: [{ key: "weighted", label: "Weighted pipeline (THB)" }],
    valueType: "money",
    data: summary.byStage.map((r) => ({ stage: STAGE_LABELS[r.stage], weighted: Math.round(r.weightedThb) })),
  };
  const pipelineByPractice: ChartSpec = {
    kind: "bar",
    xKey: "practice",
    series: [{ key: "weighted", label: "Weighted pipeline (THB)" }],
    valueType: "money",
    horizontal: true,
    data: summary.byPracticeArea.slice(0, 10).map((r) => ({ practice: r.name, weighted: Math.round(r.weightedThb) })),
  };

  // Won / lost per quarter this year (opportunities the viewer can see).
  const closed = await db.opportunity.findMany({
    where: {
      AND: [
        opportunityVisibleWhere(actor),
        { stage: { in: ["WON", "LOST"] }, closedDate: { gte: new Date(Date.UTC(year, 0, 1)) } },
      ],
    },
    select: { stage: true, closedDate: true },
  });
  const quarters = ["Q1", "Q2", "Q3", "Q4"].map((q, i) => {
    const inQ = closed.filter((o) => o.closedDate && Math.floor(o.closedDate.getUTCMonth() / 3) === i);
    return {
      quarter: `${q} ${year}`,
      won: inQ.filter((o) => o.stage === "WON").length,
      lost: inQ.filter((o) => o.stage === "LOST").length,
    };
  });
  const winLoss: ChartSpec = {
    kind: "bar",
    xKey: "quarter",
    series: [
      { key: "won", label: "Won" },
      { key: "lost", label: "Lost" },
    ],
    valueType: "number",
    data: quarters,
  };

  // Activities per month, last 6 months, stacked by type.
  const start = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() - 5, 1));
  const acts = await db.activity.findMany({
    where: { AND: [activityVisibleWhere(actor), { date: { gte: start } }] },
    select: { date: true, type: true },
  });
  const months = Array.from(
    { length: 6 },
    (_, i) => new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + i, 1)),
  );
  const used = ACTIVITY_TYPES.filter((t) => acts.some((a) => a.type === t));
  const activity: ChartSpec = {
    kind: "bar",
    xKey: "month",
    stacked: true,
    valueType: "number",
    series: used.map((t) => ({ key: t, label: ACTIVITY_TYPE_LABELS[t] })),
    data: months.map((m) => {
      const inM = acts.filter(
        (a) => a.date.getUTCFullYear() === m.getUTCFullYear() && a.date.getUTCMonth() === m.getUTCMonth(),
      );
      return {
        month: `${MONTHS[m.getUTCMonth()]} ${String(m.getUTCFullYear()).slice(2)}`,
        ...Object.fromEntries(used.map((t) => [t, inM.filter((a) => a.type === t).length])),
      };
    }),
  };

  return { summary, pipelineByStage, pipelineByPractice, winLoss, activity, year };
}
