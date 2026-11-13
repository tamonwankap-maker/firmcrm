/**
 * Thai/English text helpers.
 *
 * Thai can be typed with different Unicode sequences that look identical
 * (e.g. SARA AM "ำ" vs NIKHAHIT + SARA AA "ํา"). We normalise to NFC and
 * collapse the common SARA AM variant so search and duplicate checks match.
 */
const NIKHAHIT_SARA_AA = /ํา/g; // "ํา" → "ำ"
const ZERO_WIDTH = /[​-‍﻿]/g; // zero-width chars often pasted from Word/LINE

export function normalizeText(value: string): string {
  return value.normalize("NFC").replace(ZERO_WIDTH, "").replace(NIKHAHIT_SARA_AA, "ำ").replace(/\s+/g, " ").trim();
}

/** Normalise an optional field; empty strings become null. */
export function normalizeOptional(value: string | null | undefined): string | null {
  if (value == null) return null;
  const v = normalizeText(value);
  return v === "" ? null : v;
}

/** True if the string contains any Thai character (U+0E00–U+0E7F). */
export function containsThai(value: string): boolean {
  return /[฀-๿]/.test(value);
}

/** Escape LIKE/ILIKE wildcards so user input is matched literally. */
export function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, (m) => `\\${m}`);
}
