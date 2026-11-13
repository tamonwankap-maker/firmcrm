/**
 * Directory/referee rules (pure; unit-tested).
 */
export const REFEREE_LOOKBACK_YEARS = 2;

export interface RefereeUse {
  submissionId: string;
  year: number;
  directory: string;
  practiceArea: string;
}

/**
 * Previous uses of a contact as a referee that should trigger a warning when adding them to `current`:
 * any use in the previous two guide years, or another submission in the same year.
 */
export function refereeReuse(current: { id: string; year: number }, uses: RefereeUse[]) {
  const others = uses.filter((u) => u.submissionId !== current.id);
  const recent = others
    .filter((u) => u.year < current.year && u.year >= current.year - REFEREE_LOOKBACK_YEARS)
    .sort((a, b) => b.year - a.year);
  const sameYear = others.filter((u) => u.year === current.year);
  return { recent, sameYear, warn: recent.length + sameYear.length > 0 };
}

export function refereeWarnings(r: ReturnType<typeof refereeReuse>): string[] {
  return [
    ...r.recent.map((u) => `Already used as a referee for ${u.directory} ${u.year} (${u.practiceArea}).`),
    ...r.sameYear.map((u) => `Also a referee for ${u.directory} ${u.year} (${u.practiceArea}) this year.`),
  ];
}

/** Whole days from `today` (UTC midnight, Bangkok calendar) to a date-only deadline; negative = overdue. */
export function daysUntil(deadline: Date, today: Date): number {
  return Math.round((deadline.getTime() - today.getTime()) / 86_400_000);
}

/** How the client appears on a representative matter (respecting anonymisation). */
export function matterClientLabel(m: {
  anonymised: boolean;
  clientDisplayName: string | null;
  clientOrganisation: { nameEn: string } | null;
}): string {
  if (m.anonymised) return m.clientDisplayName ?? "Confidential client";
  return m.clientOrganisation?.nameEn ?? m.clientDisplayName ?? "—";
}
