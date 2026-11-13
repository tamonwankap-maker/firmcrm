import type { ResourceFacts } from "@/server/auth/policy";

/** Users "named on" an organisation: its relationship partner. */
export function organisationFacts(org: { relationshipPartnerId: string | null }): ResourceFacts {
  return { memberIds: org.relationshipPartnerId ? [org.relationshipPartnerId] : [] };
}
