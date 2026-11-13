import "server-only";
import ExcelJS from "exceljs";
import { decodeText, parseCsv } from "./csv";

export const MAX_IMPORT_BYTES = 5 * 1024 * 1024;
export const MAX_IMPORT_ROWS = 5000;

export interface Sheet {
  headers: string[];
  rows: string[][];
}

function cellText(v: ExcelJS.CellValue): string {
  if (v == null) return "";
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  if (typeof v === "object") {
    if ("richText" in v) return v.richText.map((r) => r.text).join("");
    if ("text" in v && typeof v.text === "string") return v.text; // hyperlink
    if ("result" in v) return cellText(v.result as ExcelJS.CellValue); // formula
    if ("error" in v) return "";
    return "";
  }
  return String(v);
}

/** Read the first worksheet of an .xlsx, or a .csv (UTF-8 or Windows-874), into header + rows. */
export async function readSheet(fileName: string, buf: Buffer): Promise<Sheet> {
  let grid: string[][];
  if (/\.csv$/i.test(fileName)) {
    grid = parseCsv(decodeText(buf));
  } else if (/\.xlsx$/i.test(fileName)) {
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(buf as unknown as ArrayBuffer);
    const ws = wb.worksheets.find((w) => w.state === "visible" && w.name !== "Instructions") ?? wb.worksheets[0];
    if (!ws) throw new Error("The workbook has no sheets.");
    grid = [];
    ws.eachRow({ includeEmpty: false }, (row) => {
      const values: string[] = [];
      for (let c = 1; c <= ws.columnCount; c++) values.push(cellText(row.getCell(c).value).trim());
      if (values.some((x) => x !== "")) grid.push(values);
    });
  } else {
    throw new Error("Upload an .xlsx or .csv file.");
  }
  const [headers = [], ...rows] = grid;
  return { headers: headers.map((h) => h.trim()), rows };
}
