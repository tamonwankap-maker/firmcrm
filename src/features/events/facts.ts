import type { ResourceFacts } from "@/server/auth/policy";

/** Event members: owner and firm speakers. */
export function eventFacts(e: { ownerId: string | null; speakers: { id: string }[] }): ResourceFacts {
  return { memberIds: [...(e.ownerId ? [e.ownerId] : []), ...e.speakers.map((s) => s.id)] };
}
