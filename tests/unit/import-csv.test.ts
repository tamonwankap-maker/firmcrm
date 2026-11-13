import { describe, expect, it } from "vitest";
import { decodeText, parseCsv } from "@/features/import/csv";
import { mapHeaders, truthy, CONTACT_COLUMNS, ORG_COLUMNS } from "@/features/import/columns";

describe("decodeText", () => {
  it("decodes UTF-8 with and without BOM", () => {
    const utf8 = new TextEncoder().encode("ชื่อ,Name");
    expect(decodeText(utf8)).toBe("ชื่อ,Name");
    expect(decodeText(new Uint8Array([0xef, 0xbb, 0xbf, ...utf8]))).toBe("ชื่อ,Name");
  });
  it("falls back to Windows-874 for Thai Excel CSVs", () => {
    // "กา" in TIS-620
    expect(decodeText(new Uint8Array([0xa1, 0xd2]))).toBe("กา");
  });
});

describe("parseCsv", () => {
  it("handles quotes, embedded commas/newlines and CRLF", () => {
    const rows = parseCsv('Name,Notes\r\n"Siam, Co.","line1\nline2"\r\nB,"say ""hi"""\r\n');
    expect(rows).toEqual([
      ["Name", "Notes"],
      ["Siam, Co.", "line1\nline2"],
      ["B", 'say "hi"'],
    ]);
  });
  it("detects semicolon-delimited files and skips blank lines", () => {
    expect(parseCsv("a;b\n\n1;2\n")).toEqual([
      ["a", "b"],
      ["1", "2"],
    ]);
  });
});

describe("mapHeaders", () => {
  it("matches template headers and common aliases case-insensitively", () => {
    const { index, missing, unknown } = mapHeaders(["Company", "TYPE", "Sector", "Random"], ORG_COLUMNS);
    expect(index).toMatchObject({ nameEn: 0, type: 1, industry: 2 });
    expect(missing).toEqual([]);
    expect(unknown).toEqual(["Random"]);
  });
  it("reports missing required columns", () => {
    expect(mapHeaders(["Email"], CONTACT_COLUMNS).missing).toEqual(["Name (EN)"]);
  });
  it("truthy accepts common yes values", () => {
    for (const v of ["Yes", "y", "TRUE", "1", "x", "ใช่"]) expect(truthy(v)).toBe(true);
    for (const v of ["", "No", "0", "maybe"]) expect(truthy(v)).toBe(false);
  });
});
