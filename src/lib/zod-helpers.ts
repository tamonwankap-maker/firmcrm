import { z } from "zod";
import { parseBangkokDateTime, parseDateOnly } from "./dates";
import { normalizeOptional, normalizeText } from "./thai";

/** HTML checkbox → boolean ("on" when ticked, absent when not). */
export const zCheckbox = z.preprocess((v) => v === "on" || v === "true" || v === true, z.boolean());

/** Repeated form field → string[] of ids. */
export const zIdList = (max = 200) =>
  z.preprocess(
    (v) => (Array.isArray(v) ? v : v ? [v] : []).filter((x) => x !== ""),
    z.array(z.string().min(1).max(40)).max(max),
  );

/** Required text, Thai-normalised. */
export const zText = (max: number, message = "Required") =>
  z
    .string()
    .transform((v) => normalizeText(v))
    .pipe(z.string().min(1, message).max(max, `Maximum ${max} characters`));

/** Optional text, Thai-normalised; blank → null. */
export const zOptText = (max: number) =>
  z.preprocess(
    (v) => (typeof v === "string" ? normalizeOptional(v) : (v ?? null)),
    z.string().max(max, `Maximum ${max} characters`).nullable(),
  );

/** Optional id (select with an empty option). */
export const zOptId = z.preprocess((v) => (v === "" || v == null ? null : v), z.string().min(1).max(40).nullable());

/** Required "YYYY-MM-DD" → Date (UTC midnight, for @db.Date). */
export const zDate = z.string({ message: "Required" }).transform((v, ctx) => {
  const d = parseDateOnly(v);
  if (!d) {
    ctx.addIssue({ code: "custom", message: "Enter a valid date" });
    return z.NEVER;
  }
  return d;
});

/** Optional date. */
export const zOptDate = z.preprocess((v) => (v === "" || v == null ? null : v), zDate.nullable());

/** Optional non-negative money amount as a string (kept as string for Prisma Decimal). */
export const zOptMoney = z.preprocess(
  (v) => (typeof v === "string" ? v.replace(/[,\s฿$]/g, "") : v) || null,
  z
    .string()
    .regex(/^\d{1,12}(\.\d{1,2})?$/, "Enter an amount, e.g. 150000 or 1500.50")
    .nullable(),
);

export const zOptEmail = z.preprocess(
  (v) => (typeof v === "string" ? v.trim().toLowerCase() || null : null),
  z.string().email("Enter a valid email").max(254).nullable(),
);

export const zOptUrl = z.preprocess((v) => {
  if (typeof v !== "string" || !v.trim()) return null;
  const t = v.trim();
  return /^https?:\/\//i.test(t) ? t : `https://${t}`;
}, z.string().url("Enter a valid web address").max(500).nullable());

/** Required "YYYY-MM-DDTHH:mm" entered in Bangkok time → UTC Date. */
export const zBangkokDateTime = z.string({ message: "Required" }).transform((v, ctx) => {
  const d = parseBangkokDateTime(v);
  if (!d) {
    ctx.addIssue({ code: "custom", message: "Enter a date and time" });
    return z.NEVER;
  }
  return d;
});
