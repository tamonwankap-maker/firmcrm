import type { ResourceFacts } from "@/server/auth/policy";

/** Members of a submission: owner, partner reviewer and ranked lawyers. */
export function submissionFacts(s: {
  ownerId: string;
  partnerReviewerId: string | null;
  rankedLawyers: { id: string }[];
}): ResourceFacts {
  return {
    memberIds: [s.ownerId, ...(s.partnerReviewerId ? [s.partnerReviewerId] : []), ...s.rankedLawyers.map((u) => u.id)],
  };
}
