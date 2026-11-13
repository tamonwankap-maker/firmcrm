import { describe, expect, it } from "vitest";
import { formatDate, formatDateOnly, formatDateTime, parseDateOnly, todayInBangkok } from "@/lib/dates";
import { formatMoney, toThb } from "@/lib/money";

describe("dates (Asia/Bangkok, DD MMM YYYY)", () => {
  it("formats timestamps in Bangkok time", () => {
    // 20:30 UTC on 31 Dec = 03:30 on 1 Jan in Bangkok (+07:00)
    expect(formatDate("2026-12-31T20:30:00Z")).toBe("01 Jan 2027");
    expect(formatDateTime("2026-12-31T20:30:00Z")).toBe("01 Jan 2027, 03:30");
  });
  it("formats date-only values without shifting the day", () => {
    expect(formatDateOnly(parseDateOnly("2026-11-13"))).toBe("13 Nov 2026");
  });
  it("rejects malformed dates", () => {
    expect(parseDateOnly("13/11/2026")).toBeNull();
    expect(formatDate(null)).toBe("");
  });
  it("computes today's Bangkok date", () => {
    expect(todayInBangkok(new Date("2026-11-13T18:00:00Z")).toISOString()).toBe("2026-11-14T00:00:00.000Z");
  });
});

describe("money", () => {
  it("formats THB and USD", () => {
    expect(formatMoney(1250000, "THB")).toBe("฿1,250,000");
    expect(formatMoney("12000.5", "USD")).toBe("US$12,000.5");
  });
  it("converts USD to THB with the configured rate", () => {
    expect(toThb(100, "USD", 35)).toBe(3500);
    expect(toThb(100, "THB", 35)).toBe(100);
  });
});

describe("formatThbCompact", () => {
  it("drops trailing .0", async () => {
    const { formatThbCompact } = await import("@/lib/money");
    expect(formatThbCompact(0)).toBe("฿0");
    expect(formatThbCompact(125_000)).toBe("฿125k");
    expect(formatThbCompact(5_250_000)).toBe("฿5.3m");
  });
});
