import "server-only";
import ExcelJS from "exceljs";
import type { ReportResult } from "../types";

const NUM_FMT = { money: "#,##0", number: "#,##0", percent: "0%", date: "dd mmm yyyy" } as const;

/** Excel workbook: title block, typed columns (real numbers and dates), autofilter, frozen header, notes. */
export async function buildWorkbook(opts: {
  title: string;
  subtitle: string;
  generatedBy: string;
  generatedAt: string;
  result: ReportResult;
}) {
  const { title, subtitle, generatedBy, generatedAt, result } = opts;
  const wb = new ExcelJS.Workbook();
  wb.creator = "BD CRM";
  wb.created = new Date();
  const ws = wb.addWorksheet(title.slice(0, 31).replace(/[\\/?*[\]:]/g, " "), {
    views: [{ state: "frozen", ySplit: 4 }],
  });

  ws.addRow([title]).font = { bold: true, size: 14 };
  ws.addRow([subtitle]).font = { color: { argb: "FF555555" } };
  ws.addRow([`Generated ${generatedAt} (Bangkok) by ${generatedBy} — confidential, internal use only`]).font = {
    italic: true,
    size: 9,
    color: { argb: "FF777777" },
  };

  const header = ws.addRow(result.columns.map((c) => c.label));
  header.font = { bold: true, color: { argb: "FFFFFFFF" } };
  header.eachCell((cell) => {
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1F3A5F" } };
    cell.alignment = { vertical: "middle", wrapText: true };
  });

  for (const row of result.rows) {
    ws.addRow(
      result.columns.map((c) => {
        const v = row[c.key];
        if (v == null) return null;
        return c.type === "date" ? new Date(String(v)) : v;
      }),
    );
  }
  if (result.totals) {
    const t = ws.addRow(result.columns.map((c) => result.totals?.[c.key] ?? null));
    t.font = { bold: true };
    t.eachCell((cell) => (cell.border = { top: { style: "thin" } }));
  }

  result.columns.forEach((c, i) => {
    const col = ws.getColumn(i + 1);
    if (c.type !== "text") col.numFmt = NUM_FMT[c.type];
    const longest = Math.max(c.label.length, ...result.rows.slice(0, 200).map((r) => String(r[c.key] ?? "").length));
    col.width = Math.min(50, Math.max(c.type === "date" ? 13 : 10, longest + 2));
  });
  ws.autoFilter = { from: { row: 4, column: 1 }, to: { row: 4, column: result.columns.length } };

  if (result.notes?.length) {
    ws.addRow([]);
    for (const n of result.notes) ws.addRow([n]).font = { italic: true, size: 9, color: { argb: "FF555555" } };
  }
  return Buffer.from(await wb.xlsx.writeBuffer());
}
