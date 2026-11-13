import type { ResourceFacts } from "@/server/auth/policy";

/** Users named on an activity: owner + internal attendees. */
export function activityFacts(a: { ownerId: string; internalAttendees: { id: string }[] }): ResourceFacts {
  return { memberIds: [a.ownerId, ...a.internalAttendees.map((u) => u.id)] };
}
