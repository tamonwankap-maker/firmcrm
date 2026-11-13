/**
 * Cross-sell analysis (pure; unit-tested): compare practices the client already uses
 * (won opportunities) with the plan's cross-sell targets and the open pipeline.
 */
export interface PracticeRef {
  id: string;
  name: string;
}

export function crossSellGaps(params: { targets: PracticeRef[]; usedWon: PracticeRef[]; openPipeline: PracticeRef[] }) {
  const used = new Set(params.usedWon.map((p) => p.id));
  const open = new Set(params.openPipeline.map((p) => p.id));
  return params.targets.map((t) => ({
    ...t,
    status: used.has(t.id) ? ("won" as const) : open.has(t.id) ? ("in_pipeline" as const) : ("gap" as const),
  }));
}

/** Distinct practices across opportunities. */
export function distinctPractices(opps: { practiceAreas: PracticeRef[] }[]): PracticeRef[] {
  const m = new Map<string, PracticeRef>();
  for (const o of opps) for (const p of o.practiceAreas) m.set(p.id, p);
  return [...m.values()].sort((a, b) => a.name.localeCompare(b.name));
}
