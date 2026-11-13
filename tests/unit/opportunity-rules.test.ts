import { describe, expect, it } from "vitest";
import {
  checkStageChange,
  closingFields,
  feeEstimate,
  probabilityForStage,
  weightedValueThb,
  winRate,
} from "@/features/opportunities/rules";
import { summarisePipeline, type SummaryInput } from "@/features/opportunities/summary";
import { opportunityInputSchema } from "@/features/opportunities/schema";
import { checklistProgress } from "@/features/pitches/facts";
import { bangkokInputDaysFromNow, parseBangkokDateTime, toBangkokInput } from "@/lib/dates";
import { DEFAULT_SETTINGS } from "@/features/settings/schema";

describe("checkStageChange", () => {
  it("requires a reason to close as Won or Lost", () => {
    expect(
      checkStageChange({ from: "SUBMITTED", to: "WON", conflictStatus: "CLEARED" }).errors.outcomeReason,
    ).toBeDefined();
    expect(
      checkStageChange({ from: "SUBMITTED", to: "LOST", conflictStatus: "CLEARED", outcomeReason: "PRICE" }).errors,
    ).toEqual({});
  });
  it("blocks Won when there is a conflict", () => {
    expect(
      checkStageChange({ from: "SUBMITTED", to: "WON", conflictStatus: "CONFLICT", outcomeReason: "EXPERTISE" }).errors
        .stage,
    ).toMatch(/conflict/);
  });
  it("warns (does not block) when moving into active work without conflict clearance", () => {
    const c = checkStageChange({ from: "QUALIFIED", to: "PROPOSAL_PREPARING", conflictStatus: "REQUESTED" });
    expect(c.errors).toEqual({});
    expect(c.warnings).toHaveLength(1);
    expect(checkStageChange({ from: "LEAD", to: "QUALIFIED", conflictStatus: "NOT_REQUESTED" }).warnings).toEqual([]);
    expect(checkStageChange({ from: "QUALIFIED", to: "SUBMITTED", conflictStatus: "CLEARED" }).warnings).toEqual([]);
  });
  it("rejects a no-op change", () => {
    expect(checkStageChange({ from: "LEAD", to: "LEAD", conflictStatus: "CLEARED" }).errors.stage).toBeDefined();
  });
});

describe("probability, value and closing", () => {
  it("forces 100/0 for Won/Lost and uses settings otherwise", () => {
    const d = DEFAULT_SETTINGS.stageDefaultProbability;
    expect(probabilityForStage("WON", d)).toBe(100);
    expect(probabilityForStage("LOST", d)).toBe(0);
    expect(probabilityForStage("SUBMITTED", { ...d, SUBMITTED: 70 })).toBe(70);
  });
  it("fee estimate uses the midpoint or whichever bound exists", () => {
    expect(feeEstimate(100, 300)).toBe(200);
    expect(feeEstimate(null, 300)).toBe(300);
    expect(feeEstimate("150", null)).toBe(150);
    expect(feeEstimate(null, null)).toBeNull();
  });
  it("weights by probability and converts USD to THB", () => {
    expect(
      weightedValueThb({ feeEstimateMin: 100_000, feeEstimateMax: 300_000, currency: "USD", probability: 50 }, 35),
    ).toBe(3_500_000);
    expect(weightedValueThb({ feeEstimateMin: null, feeEstimateMax: null, currency: "THB", probability: 90 }, 35)).toBe(
      0,
    );
  });
  it("sets closing fields only for Won/Lost, clears them when reopened", () => {
    const today = new Date("2026-11-13T00:00:00Z");
    expect(closingFields("WON", { outcomeReason: "PRICE" }, today)).toEqual({
      outcomeReason: "PRICE",
      outcome: null,
      closedDate: today,
    });
    expect(closingFields("QUALIFIED", { outcomeReason: "PRICE", outcome: "x" }, today)).toEqual({
      outcomeReason: null,
      outcome: null,
      closedDate: null,
    });
  });
  it("win rate", () => {
    expect(winRate(3, 1)).toBe(75);
    expect(winRate(0, 0)).toBeNull();
  });
});

describe("summarisePipeline", () => {
  const base: SummaryInput = {
    stage: "SUBMITTED",
    source: "REFERRAL",
    confidential: false,
    feeEstimateMin: null,
    feeEstimateMax: null,
    currency: "THB",
    probability: 50,
    closedDate: null,
    outcomeReason: null,
    practiceAreas: [{ name: "Tax" }],
  };
  const yearStart = new Date("2026-01-01T00:00:00Z");
  it("counts confidential deals in totals and splits value across practice areas", () => {
    const s = summarisePipeline(
      [
        { ...base, feeEstimateMin: 1_000_000, feeEstimateMax: 1_000_000 },
        {
          ...base,
          confidential: true,
          feeEstimateMin: 2_000_000,
          feeEstimateMax: 2_000_000,
          practiceAreas: [{ name: "Tax" }, { name: "Corporate/M&A" }],
        },
      ],
      35,
      yearStart,
    );
    expect(s.totals.openCount).toBe(2);
    expect(s.totals.confidentialOpen).toBe(1);
    expect(s.totals.weightedThb).toBe(1_500_000);
    expect(s.byPracticeArea).toEqual([
      { name: "Tax", count: 2, weightedThb: 1_000_000 },
      { name: "Corporate/M&A", count: 1, weightedThb: 500_000 },
    ]);
  });
  it("computes this year's win rate, sources and loss reasons; ignores previous years", () => {
    const s = summarisePipeline(
      [
        { ...base, stage: "WON", closedDate: new Date("2026-03-01"), feeEstimateMin: 500_000, feeEstimateMax: 500_000 },
        { ...base, stage: "LOST", closedDate: new Date("2026-04-01"), outcomeReason: "PRICE" },
        { ...base, stage: "LOST", closedDate: new Date("2025-12-01"), outcomeReason: "TIMING" },
      ],
      35,
      yearStart,
    );
    expect(s.year).toEqual({ won: 1, lost: 1, wonValueThb: 500_000, winRate: 50 });
    expect(s.lossReasons).toEqual([{ reason: "PRICE", count: 1 }]);
    expect(s.bySource).toEqual([{ source: "REFERRAL", won: 1, lost: 1, open: 0, winRate: 50 }]);
  });
});

describe("opportunity schema", () => {
  const ok = { name: "Deal", organisationId: "o", source: "INBOUND", leadPartnerId: "u", practiceAreaIds: "pa" };
  it("rejects min fee above max and requires a practice area", () => {
    expect(opportunityInputSchema.safeParse({ ...ok, feeEstimateMin: "200", feeEstimateMax: "100" }).success).toBe(
      false,
    );
    expect(opportunityInputSchema.safeParse({ ...ok, practiceAreaIds: "" }).success).toBe(false);
  });
  it("parses competitors and only allows open starting stages", () => {
    expect(opportunityInputSchema.parse({ ...ok, competitors: "Firm A, Firm B; Firm A" }).competitors).toEqual([
      "Firm A",
      "Firm B",
    ]);
    expect(opportunityInputSchema.safeParse({ ...ok, stage: "WON" }).success).toBe(false);
  });
});

describe("pitch helpers and Bangkok date-times", () => {
  it("checklist progress", () => {
    expect(checklistProgress([{ done: true }, { done: false }])).toEqual({ done: 1, total: 2, complete: false });
    expect(checklistProgress([{ done: true }]).complete).toBe(true);
  });
  it("round-trips datetime-local values in Bangkok time", () => {
    const d = parseBangkokDateTime("2026-11-20T17:00")!;
    expect(d.toISOString()).toBe("2026-11-20T10:00:00.000Z");
    expect(toBangkokInput(d)).toBe("2026-11-20T17:00");
    expect(parseBangkokDateTime("20/11/2026 17:00")).toBeNull();
    expect(bangkokInputDaysFromNow(7, "17:00", new Date("2026-11-13T20:00:00Z"))).toBe("2026-11-21T17:00");
  });
});
