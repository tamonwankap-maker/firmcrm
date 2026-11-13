import type { ResourceFacts } from "@/server/auth/policy";

/** Members of an opportunity: lead partner + team. Confidential flag gates visibility. */
export function opportunityFacts(o: {
  leadPartnerId: string;
  team: { id: string }[];
  confidential: boolean;
}): ResourceFacts {
  return { confidential: o.confidential, memberIds: [o.leadPartnerId, ...o.team.map((t) => t.id)] };
}
