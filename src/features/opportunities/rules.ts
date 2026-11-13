/**
 * Pipeline business rules (pure; unit-tested in tests/unit/opportunity-rules.test.ts).
 */
import { toThb, type CurrencyCode } from "@/lib/money";
import type { ConflictKey, OutcomeReasonKey, StageKey } from "../labels";

export const CLOSED_STAGES: readonly StageKey[] = ["WON", "LOST"];
export const isClosed = (s: StageKey) => CLOSED_STAGES.includes(s);

/** Stages at which work is being done for the client — a conflict check should be cleared first. */
const NEEDS_CLEARANCE: readonly StageKey[] = ["PROPOSAL_PREPARING", "SUBMITTED", "WON"];

export interface StageChangeInput {
  from: StageKey;
  to: StageKey;
  conflictStatus: ConflictKey;
  outcomeReason?: OutcomeReasonKey | null;
}

export interface StageCheck {
  /** Blocking problems, keyed by form field. */
  errors: Record<string, string>;
  /** Non-blocking: the user must confirm to continue. */
  warnings: string[];
}

export function checkStageChange({ from, to, conflictStatus, outcomeReason }: StageChangeInput): StageCheck {
  const errors: Record<string, string> = {};
  const warnings: string[] = [];
  if (from === to) errors.stage = "The opportunity is already at this stage.";
  if (isClosed(to) && !outcomeReason) errors.outcomeReason = "Choose a reason for the win or loss.";
  if (to === "WON" && conflictStatus === "CONFLICT") {
    errors.stage = "Cannot mark as Won while the conflict check shows a conflict.";
  }
  if (NEEDS_CLEARANCE.includes(to) && conflictStatus !== "CLEARED" && conflictStatus !== "CONFLICT") {
    warnings.push("The conflict check has not been cleared yet.");
  }
  return { errors, warnings };
}

/** Probability after a stage change: Won = 100, Lost = 0, otherwise the configured default. */
export function probabilityForStage(to: StageKey, defaults: Record<StageKey, number>): number {
  if (to === "WON") return 100;
  if (to === "LOST") return 0;
  return defaults[to];
}

type Num = { toString(): string } | number | null | undefined;
const num = (v: Num) => (v == null ? null : Number(v.toString()));

/** Point estimate of the fee: midpoint of min/max, or whichever is set. */
export function feeEstimate(min: Num, max: Num): number | null {
  const a = num(min);
  const b = num(max);
  if (a != null && b != null) return (a + b) / 2;
  return a ?? b ?? null;
}

/** Fee estimate × probability, in THB. */
export function weightedValueThb(
  o: { feeEstimateMin: Num; feeEstimateMax: Num; currency: CurrencyCode; probability: number },
  usdToThbRate: number,
): number {
  const fee = feeEstimate(o.feeEstimateMin, o.feeEstimateMax);
  if (fee == null) return 0;
  return (toThb(fee, o.currency, usdToThbRate) * o.probability) / 100;
}

/** "Pre-closing" state is cleared when a closed opportunity is reopened. */
export function closingFields(
  to: StageKey,
  input: { outcomeReason?: OutcomeReasonKey | null; outcome?: string | null; closedDate?: Date | null },
  today: Date,
) {
  if (isClosed(to)) {
    return {
      outcomeReason: input.outcomeReason ?? null,
      outcome: input.outcome ?? null,
      closedDate: input.closedDate ?? today,
    };
  }
  return { outcomeReason: null, outcome: null, closedDate: null };
}

/** Win rate over closed opportunities (null if none closed). */
export function winRate(won: number, lost: number): number | null {
  return won + lost === 0 ? null : Math.round((won / (won + lost)) * 100);
}
