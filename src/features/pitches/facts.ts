import type { ResourceFacts } from "@/server/auth/policy";

/** Pitch members: its owner plus the opportunity's lead partner and team; confidentiality follows the opportunity. */
export function pitchFacts(p: {
  ownerId: string;
  opportunity: { leadPartnerId: string; team: { id: string }[]; confidential: boolean };
}): ResourceFacts {
  return {
    confidential: p.opportunity.confidential,
    memberIds: [p.ownerId, p.opportunity.leadPartnerId, ...p.opportunity.team.map((t) => t.id)],
  };
}

/** "3 of 5" style progress. */
export function checklistProgress(items: { done: boolean }[]) {
  const done = items.filter((i) => i.done).length;
  return { done, total: items.length, complete: items.length > 0 && done === items.length };
}
