import { describe, expect, it } from "vitest";
import { daysUntil, matterClientLabel, refereeReuse, refereeWarnings } from "@/features/rankings/rules";
import { matterInputSchema } from "@/features/matters/schema";
import { submissionInputSchema } from "@/features/rankings/schema";

const use = (submissionId: string, year: number, directory = "Legal 500", practiceArea = "Capital Markets") => ({
  submissionId,
  year,
  directory,
  practiceArea,
});

describe("refereeReuse", () => {
  const current = { id: "cur", year: 2027 };
  it("warns for use in the previous two guide years", () => {
    const r = refereeReuse(current, [use("a", 2026), use("b", 2025, "Chambers & Partners", "Corporate/M&A")]);
    expect(r.recent.map((u) => u.year)).toEqual([2026, 2025]);
    expect(r.warn).toBe(true);
    expect(refereeWarnings(r)).toEqual([
      "Already used as a referee for Legal 500 2026 (Capital Markets).",
      "Already used as a referee for Chambers & Partners 2025 (Corporate/M&A).",
    ]);
  });
  it("does not warn for older use", () => {
    expect(refereeReuse(current, [use("a", 2024)]).warn).toBe(false);
  });
  it("warns for another submission in the same year, but not the current one", () => {
    const r = refereeReuse(current, [use("cur", 2027), use("c", 2027, "Chambers & Partners")]);
    expect(r.sameYear.map((u) => u.submissionId)).toEqual(["c"]);
    expect(refereeWarnings(r)[0]).toMatch(/this year/);
  });
  it("ignores future years", () => {
    expect(refereeReuse(current, [use("f", 2028)]).warn).toBe(false);
  });
});

describe("helpers", () => {
  it("daysUntil counts whole days, negative when overdue", () => {
    const today = new Date("2026-11-13T00:00:00Z");
    expect(daysUntil(new Date("2026-11-23T00:00:00Z"), today)).toBe(10);
    expect(daysUntil(new Date("2026-11-10T00:00:00Z"), today)).toBe(-3);
  });
  it("matterClientLabel respects anonymisation", () => {
    expect(
      matterClientLabel({
        anonymised: true,
        clientDisplayName: "a Japanese bank",
        clientOrganisation: { nameEn: "MUFG" },
      }),
    ).toBe("a Japanese bank");
    expect(
      matterClientLabel({ anonymised: false, clientDisplayName: null, clientOrganisation: { nameEn: "MUFG" } }),
    ).toBe("MUFG");
  });
});

describe("matter schema", () => {
  const base = { title: "Deal", year: "2025", description: "x", practiceAreaIds: "pa", clientOrganisationId: "o" };
  it("accepts a normal matter", () => expect(matterInputSchema.safeParse(base).success).toBe(true));
  it("anonymised needs a client description", () => {
    expect(matterInputSchema.safeParse({ ...base, anonymised: "on" }).success).toBe(false);
    expect(matterInputSchema.safeParse({ ...base, anonymised: "on", clientDisplayName: "a Thai bank" }).success).toBe(
      true,
    );
  });
  it("confidential cannot be publishable", () => {
    expect(matterInputSchema.safeParse({ ...base, confidential: "on", publishable: "on" }).success).toBe(false);
  });
  it("needs a client or a description, and a practice area", () => {
    expect(matterInputSchema.safeParse({ ...base, clientOrganisationId: "" }).success).toBe(false);
    expect(matterInputSchema.safeParse({ ...base, practiceAreaIds: "" }).success).toBe(false);
  });
});

describe("submission schema", () => {
  it("requires directory, year and practice area", () => {
    expect(submissionInputSchema.safeParse({ year: "2027" }).success).toBe(false);
    expect(submissionInputSchema.parse({ directoryId: "d", year: "2027", practiceAreaId: "p" })).toMatchObject({
      year: 2027,
      status: "PLANNING",
    });
  });
});
