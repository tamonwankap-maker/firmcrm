import type { Role } from "@/server/auth/policy";

export type ColumnType = "text" | "number" | "money" | "percent" | "date";

export interface ReportColumn {
  key: string;
  label: string;
  type: ColumnType;
}

/** Raw cell values: numbers stay numbers, dates are ISO strings, so each renderer formats them its own way. */
export type Cell = string | number | null;
export type Row = Record<string, Cell>;

export interface ChartSpec {
  kind: "bar";
  /** Category axis key in `data`. */
  xKey: string;
  series: { key: string; label: string }[];
  stacked?: boolean;
  horizontal?: boolean;
  valueType: "number" | "money";
  data: Row[];
}

export interface ReportResult {
  columns: ReportColumn[];
  rows: Row[];
  totals?: Row;
  /** Short facts shown above the table, e.g. "Win rate 62%". */
  highlights?: { label: string; value: string }[];
  /** Caveats, e.g. confidential records excluded. */
  notes?: string[];
  chart?: ChartSpec;
}

export type ParamKind = "dateRange" | "year" | "practice" | "list";

export interface ReportDef<P = ReportParams> {
  id: string;
  title: string;
  description: string;
  roles: Role[];
  params: ParamKind[];
  run: (actor: { id: string; role: Role }, params: P) => Promise<ReportResult>;
}

export interface ReportParams {
  from: Date;
  to: Date;
  year: number;
  practice?: string;
  list: "NEWSLETTER" | "CLIENT_ALERTS" | "EVENT_INVITES";
}
