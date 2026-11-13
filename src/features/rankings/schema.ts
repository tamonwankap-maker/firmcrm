import { z } from "zod";
import { zDate, zIdList, zOptDate, zOptId, zOptText } from "@/lib/zod-helpers";
import { SUBMISSION_STATUSES } from "../labels";

export const submissionInputSchema = z.object({
  directoryId: z.string({ message: "Choose a directory" }).min(1, "Choose a directory").max(40),
  year: z.coerce.number({ message: "Enter the guide year" }).int().min(2000, "Enter the guide year").max(2100),
  practiceAreaId: z.string({ message: "Choose a practice area" }).min(1, "Choose a practice area").max(40),
  deadline: zOptDate,
  ownerId: zOptId,
  partnerReviewerId: zOptId,
  status: z.enum(SUBMISSION_STATUSES).default("PLANNING"),
  resultTier: zOptText(100),
  rankedLawyerIds: zIdList(30),
  matterIds: zIdList(50),
  notes: zOptText(10_000),
});
export type SubmissionInput = z.infer<typeof submissionInputSchema>;

export const refereeInputSchema = z.object({
  contactId: z.string({ message: "Choose a contact" }).min(1, "Choose a contact").max(40),
  notes: zOptText(2000),
  confirm: z.preprocess((v) => v === "on", z.boolean()).optional(),
});

export const refereeBriefSchema = z.object({ briefed: z.boolean(), briefedDate: zDate.optional() });
