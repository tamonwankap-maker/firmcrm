import type { ResourceFacts } from "@/server/auth/policy";

/** Users named on a contact: its relationship owners. */
export function contactFacts(c: { owners: { id: string }[] }): ResourceFacts {
  return { memberIds: c.owners.map((o) => o.id) };
}
