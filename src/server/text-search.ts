import { escapeLike, normalizeText } from "@/lib/thai";

/**
 * Split a search box value into terms. Thai has no spaces, so a Thai query is usually one term;
 * English "siam cement" becomes two terms that must BOTH match (in any of the fields).
 */
export function searchTerms(q: string | undefined): string[] {
  if (!q) return [];
  return normalizeText(q)
    .split(" ")
    .filter((t) => t.length > 0)
    .slice(0, 5);
}

/**
 * Prisma where-fragment: every term must appear (case-insensitive substring) in at least one field.
 * Uses ILIKE, which the pg_trgm GIN indexes accelerate.
 */
export function textSearchWhere<F extends string>(fields: readonly F[], q: string | undefined) {
  const terms = searchTerms(q);
  if (terms.length === 0) return {};
  return {
    AND: terms.map((term) => ({
      OR: fields.map((f) => ({ [f]: { contains: term, mode: "insensitive" as const } })),
    })),
  };
}

export { escapeLike };
