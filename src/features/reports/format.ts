import { formatDateOnly } from "@/lib/dates";
import type { Cell, ColumnType } from "./types";

/** Display text for a cell (web table and PDF). Excel uses typed cells instead. */
export function formatCell(value: Cell, type: ColumnType): string {
  if (value == null || value === "") return "";
  switch (type) {
    case "money":
      return typeof value === "number" ? value.toLocaleString("en-GB", { maximumFractionDigits: 0 }) : String(value);
    case "number":
      return typeof value === "number" ? value.toLocaleString("en-GB") : String(value);
    case "percent":
      return typeof value === "number" ? `${Math.round(value * 100)}%` : String(value);
    case "date":
      return formatDateOnly(String(value));
    default:
      return String(value);
  }
}

export const isNumeric = (t: ColumnType) => t === "money" || t === "number" || t === "percent";

/** Safe file name: "win-loss_2026-01-01_2026-11-13.xlsx". */
export function exportFileName(reportId: string, query: string, ext: "xlsx" | "pdf"): string {
  const parts = [reportId, ...[...new URLSearchParams(query).values()]].map((p) => p.replace(/[^A-Za-z0-9_-]/g, ""));
  return `${parts.filter(Boolean).join("_")}.${ext}`;
}
