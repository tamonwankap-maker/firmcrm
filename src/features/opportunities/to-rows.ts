import "server-only";
import { can, type Actor } from "@/server/auth/policy";
import { formatDateOnly } from "@/lib/dates";
import { formatFeeRange, formatMoney, formatThbCompact } from "@/lib/money";
import { ACTIVE_STAGES, STAGES } from "../labels";
import { opportunityFacts } from "./facts";
import type { OppListRow } from "./queries";
import { weightedValueThb } from "./rules";
import type { BoardCard } from "./components/opportunity-board";
import type { OppTableRow } from "./components/opportunities-table";

export function toTableRows(rows: OppListRow[], usdToThbRate: number): OppTableRow[] {
  return rows.map((o) => ({
    id: o.id,
    name: o.name,
    confidential: o.confidential,
    organisation: { id: o.organisation.id, nameEn: o.organisation.nameEn },
    stage: o.stage,
    lead: o.leadPartner.name,
    practiceAreas: o.practiceAreas.map((p) => p.name).join(", "),
    fee: formatFeeRange(o.feeEstimateMin, o.feeEstimateMax, o.currency),
    probability: o.probability,
    weighted: formatMoney(Math.round(weightedValueThb(o, usdToThbRate)), "THB"),
    conflict: o.conflictStatus,
    expectedDecision: formatDateOnly(o.expectedDecisionDate),
  }));
}

export function toBoard(actor: Actor, rows: OppListRow[], usdToThbRate: number) {
  const cards: BoardCard[] = rows.map((o) => ({
    id: o.id,
    name: o.name,
    organisation: o.organisation.nameEn,
    stage: o.stage,
    lead: o.leadPartner.name,
    fee: formatFeeRange(o.feeEstimateMin, o.feeEstimateMax, o.currency),
    probability: o.probability,
    confidential: o.confidential,
    conflictWarning:
      (["PROPOSAL_PREPARING", "SUBMITTED"] as string[]).includes(o.stage) && o.conflictStatus !== "CLEARED",
    nextPitch: o.pitches[0] ? formatDateOnly(o.pitches[0].deadline) : null,
    canEdit: can(actor, "update", "Opportunity", opportunityFacts(o)),
  }));
  const columnTotals: Record<string, string> = {};
  for (const s of STAGES) {
    if (!(ACTIVE_STAGES as readonly string[]).includes(s)) continue;
    const total = rows.filter((o) => o.stage === s).reduce((sum, o) => sum + weightedValueThb(o, usdToThbRate), 0);
    if (total > 0) columnTotals[s] = formatThbCompact(total);
  }
  return { cards, columnTotals };
}
