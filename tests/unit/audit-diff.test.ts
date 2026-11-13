import { describe, expect, it } from "vitest";
import { Decimal } from "decimal.js";
import { computeDiff } from "@/server/audit-diff";

describe("computeDiff", () => {
  it("records only changed fields as [old, new]", () => {
    expect(computeDiff({ a: 1, b: "x" }, { a: 2, b: "x" })).toEqual({ a: [1, 2] });
  });
  it("handles create (before null) and delete (after null)", () => {
    expect(computeDiff(null, { a: 1 })).toEqual({ a: [null, 1] });
    expect(computeDiff({ a: 1 }, null)).toEqual({ a: [1, null] });
  });
  it("ignores createdAt/updatedAt", () => {
    expect(computeDiff({ updatedAt: new Date(1) }, { updatedAt: new Date(2) })).toEqual({});
  });
  it("redacts password hashes", () => {
    expect(computeDiff({ passwordHash: "old" }, { passwordHash: "new" })).toEqual({
      passwordHash: ["[redacted]", "[redacted]"],
    });
  });
  it("serialises dates, decimals and arrays", () => {
    const d = computeDiff(
      { when: new Date("2026-01-01T00:00:00Z"), fee: new Decimal("100.50"), tags: ["a"] },
      { when: new Date("2026-01-02T00:00:00Z"), fee: new Decimal("100.50"), tags: ["a", "b"] },
    );
    expect(d).toEqual({
      when: ["2026-01-01T00:00:00.000Z", "2026-01-02T00:00:00.000Z"],
      tags: [["a"], ["a", "b"]],
    });
  });
  it("keeps Thai text intact", () => {
    expect(computeDiff({ nameTh: "บริษัท ก" }, { nameTh: "บริษัท ข" })).toEqual({ nameTh: ["บริษัท ก", "บริษัท ข"] });
  });
});
