import { describe, expect, it } from "vitest";
import { describeParams, endOfDayBangkok, paramsToQuery, parseReportParams } from "@/features/reports/params";
import { exportFileName, formatCell } from "@/features/reports/format";
import { REPORTS } from "@/features/reports/registry";

const today = new Date("2026-11-13T00:00:00Z");

describe("report params", () => {
  it("defaults to this year to date, next guide year, newsletter", () => {
    const p = parseReportParams({}, today);
    expect(p.from.toISOString()).toBe("2026-01-01T00:00:00.000Z");
    expect(p.to.toISOString()).toBe("2026-11-13T00:00:00.000Z");
    expect(p.year).toBe(2027);
    expect(p.list).toBe("NEWSLETTER");
  });
  it("swaps a reversed range and ignores junk", () => {
    const p = parseReportParams({ from: "2026-12-31", to: "2026-01-01", list: "SPAM", year: "abc" }, today);
    expect([p.from.toISOString().slice(0, 10), p.to.toISOString().slice(0, 10)]).toEqual(["2026-01-01", "2026-12-31"]);
    expect(p.list).toBe("NEWSLETTER");
    expect(p.year).toBe(2027);
  });
  it("builds queries and descriptions only from the params a report uses", () => {
    const p = parseReportParams({ from: "2026-01-01", to: "2026-03-31", list: "CLIENT_ALERTS" }, today);
    expect(paramsToQuery(p, ["dateRange"])).toBe("from=2026-01-01&to=2026-03-31");
    expect(paramsToQuery(p, ["list"])).toBe("list=CLIENT_ALERTS");
    expect(describeParams(p, ["dateRange", "practice"], "Tax")).toBe("01 Jan 2026 – 31 Mar 2026 · Tax");
  });
  it("end of a Bangkok day in UTC", () => {
    expect(endOfDayBangkok(new Date("2026-11-13T00:00:00Z")).toISOString()).toBe("2026-11-13T17:00:00.000Z");
  });
});

describe("report formatting", () => {
  it("formats cells by type", () => {
    expect(formatCell(1234567.4, "money")).toBe("1,234,567");
    expect(formatCell(0.625, "percent")).toBe("63%");
    expect(formatCell("2026-11-13T00:00:00.000Z", "date")).toBe("13 Nov 2026");
    expect(formatCell(null, "text")).toBe("");
    expect(formatCell("ธนาคาร", "text")).toBe("ธนาคาร");
  });
  it("export file names are safe", () => {
    expect(exportFileName("win-loss", "from=2026-01-01&to=2026-12-31", "xlsx")).toBe(
      "win-loss_2026-01-01_2026-12-31.xlsx",
    );
    expect(exportFileName("x", "q=../../etc", "pdf")).toBe("x_etc.pdf");
  });
});

describe("report registry", () => {
  it("viewers have no reports; consent list is BD/Admin only", () => {
    expect(REPORTS.filter((r) => r.roles.includes("VIEWER"))).toEqual([]);
    expect(REPORTS.find((r) => r.id === "consent")?.roles).toEqual(["ADMIN", "BD"]);
    expect(new Set(REPORTS.map((r) => r.id)).size).toBe(REPORTS.length);
  });
});
