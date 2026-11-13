/**
 * Field-level diff for the audit log: { field: [old, new] }.
 * Pure (no DB) so it can be unit-tested.
 */

/** Fields never written to the audit log. */
const REDACTED = new Set(["passwordHash"]);
/** Bookkeeping fields that change on every write and add noise. */
const IGNORED = new Set(["updatedAt", "createdAt"]);

/** Prisma Decimal (decimal.js) values. */
function isDecimalLike(value: object): value is { toString(): string } {
  const v = value as Record<string, unknown>;
  return typeof v.toFixed === "function" && typeof v.isNaN === "function";
}

type Json = string | number | boolean | null | Json[] | { [k: string]: Json };

function toJson(value: unknown): Json {
  if (value === undefined || value === null) return null;
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "bigint") return value.toString();
  if (Array.isArray(value)) return value.map(toJson);
  if (typeof value === "object") {
    if (isDecimalLike(value)) return value.toString();
    const out: Record<string, Json> = {};
    for (const [k, inner] of Object.entries(value as Record<string, unknown>)) out[k] = toJson(inner);
    return out;
  }
  if (typeof value === "number" || typeof value === "string" || typeof value === "boolean") return value;
  return String(value);
}

export function computeDiff(
  before: Record<string, unknown> | null,
  after: Record<string, unknown> | null,
): Record<string, [Json, Json]> {
  const keys = new Set([...Object.keys(before ?? {}), ...Object.keys(after ?? {})]);
  const diff: Record<string, [Json, Json]> = {};
  for (const key of keys) {
    if (IGNORED.has(key)) continue;
    const oldV = toJson(before?.[key]);
    const newV = toJson(after?.[key]);
    if (JSON.stringify(oldV) === JSON.stringify(newV)) continue;
    diff[key] = REDACTED.has(key) ? ["[redacted]", "[redacted]"] : [oldV, newV];
  }
  return diff;
}
