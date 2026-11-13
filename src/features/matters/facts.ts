import type { ResourceFacts } from "@/server/auth/policy";

export function matterFacts(m: { confidential: boolean; team: { id: string }[] }): ResourceFacts {
  return { confidential: m.confidential, memberIds: m.team.map((t) => t.id) };
}
