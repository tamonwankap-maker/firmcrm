import { z } from "zod";
import { formatDateOnly, parseDateOnly, todayInBangkok } from "@/lib/dates";
import { MAILING_LIST_LABELS, MAILING_LISTS } from "../labels";
import type { ParamKind, ReportParams } from "./types";

const ymd = (d: Date) => d.toISOString().slice(0, 10);

/** Parse report params from a query string, with sensible defaults (this calendar year to date). */
export function parseReportParams(
  sp: Record<string, string | string[] | undefined>,
  today: Date = todayInBangkok(),
): ReportParams {
  const str = (k: string) => (typeof sp[k] === "string" ? (sp[k] as string) : undefined);
  const yearStart = new Date(Date.UTC(today.getUTCFullYear(), 0, 1));
  let from = parseDateOnly(str("from") ?? "") ?? yearStart;
  let to = parseDateOnly(str("to") ?? "") ?? today;
  if (from > to) [from, to] = [to, from];
  const year = z.coerce
    .number()
    .int()
    .min(2000)
    .max(2100)
    .catch(today.getUTCFullYear() + 1)
    .parse(str("year") ?? today.getUTCFullYear() + 1);
  const practice = z
    .string()
    .max(40)
    .optional()
    .catch(undefined)
    .parse(str("practice") || undefined);
  const list = z.enum(MAILING_LISTS).catch("NEWSLETTER").parse(str("list"));
  return { from, to, year, practice, list };
}

/** Query string for links / exports, including only the params the report uses. */
export function paramsToQuery(p: ReportParams, kinds: ParamKind[]): string {
  const q = new URLSearchParams();
  if (kinds.includes("dateRange")) {
    q.set("from", ymd(p.from));
    q.set("to", ymd(p.to));
  }
  if (kinds.includes("year")) q.set("year", String(p.year));
  if (kinds.includes("practice") && p.practice) q.set("practice", p.practice);
  if (kinds.includes("list")) q.set("list", p.list);
  return q.toString();
}

/** Human description for headers: "01 Jan 2026 – 13 Nov 2026 · Capital Markets". */
export function describeParams(p: ReportParams, kinds: ParamKind[], practiceName?: string): string {
  const parts: string[] = [];
  if (kinds.includes("dateRange")) parts.push(`${formatDateOnly(p.from)} – ${formatDateOnly(p.to)}`);
  if (kinds.includes("year")) parts.push(`Guide year ${p.year}`);
  if (kinds.includes("practice") && practiceName) parts.push(practiceName);
  if (kinds.includes("list")) parts.push(MAILING_LIST_LABELS[p.list]);
  return parts.join(" · ");
}

/** Inclusive end of a date-only range as a timestamp bound (next day 00:00 Bangkok → UTC). */
export function endOfDayBangkok(d: Date): Date {
  return new Date(d.getTime() + 86_400_000 - 7 * 3600_000);
}
export function startOfDayBangkok(d: Date): Date {
  return new Date(d.getTime() - 7 * 3600_000);
}
