import { format } from "date-fns";
import { TZDate } from "@date-fns/tz";

export const FIRM_TIMEZONE = "Asia/Bangkok";

type DateInput = Date | string | number | null | undefined;

function toDate(value: DateInput): Date | null {
  if (value == null || value === "") return null;
  const d = value instanceof Date ? value : new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** "13 Nov 2026" in Bangkok time. Use for timestamps. */
export function formatDate(value: DateInput): string {
  const d = toDate(value);
  return d ? format(new TZDate(d, FIRM_TIMEZONE), "dd MMM yyyy") : "";
}

/** "13 Nov 2026, 14:05" in Bangkok time. */
export function formatDateTime(value: DateInput): string {
  const d = toDate(value);
  return d ? format(new TZDate(d, FIRM_TIMEZONE), "dd MMM yyyy, HH:mm") : "";
}

/**
 * Format a date-only DB value (@db.Date). Prisma returns these as UTC midnight,
 * so format in UTC to avoid shifting the calendar day.
 */
export function formatDateOnly(value: DateInput): string {
  const d = toDate(value);
  return d ? format(new TZDate(d, "UTC"), "dd MMM yyyy") : "";
}

/** Parse "YYYY-MM-DD" (HTML date input) to a UTC-midnight Date for @db.Date columns. */
export function parseDateOnly(value: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const d = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** Today's calendar date in Bangkok, as UTC midnight (for comparing with @db.Date). */
export function todayInBangkok(now: Date = new Date()): Date {
  const ymd = format(new TZDate(now, FIRM_TIMEZONE), "yyyy-MM-dd");
  return new Date(`${ymd}T00:00:00.000Z`);
}

/** "YYYY-MM-DDTHH:mm" (datetime-local, entered in Bangkok time) → UTC Date. */
export function parseBangkokDateTime(value: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) return null;
  const d = new Date(`${value}:00+07:00`);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** UTC Date → "YYYY-MM-DDTHH:mm" in Bangkok time, for datetime-local inputs. */
export function toBangkokInput(value: DateInput): string {
  const d = toDate(value);
  return d ? format(new TZDate(d, FIRM_TIMEZONE), "yyyy-MM-dd'T'HH:mm") : "";
}

/** Date-time input value N days from now at a fixed Bangkok time, e.g. "2026-11-20T17:00". */
export function bangkokInputDaysFromNow(days: number, time = "17:00", now: Date = new Date()): string {
  return `${toBangkokInput(new Date(now.getTime() + days * 86_400_000)).slice(0, 10)}T${time}`;
}
