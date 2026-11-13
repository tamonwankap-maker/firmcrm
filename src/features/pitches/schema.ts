import { z } from "zod";
import { zBangkokDateTime, zOptId, zOptText, zText } from "@/lib/zod-helpers";
import { PITCH_FORMATS, PITCH_STATUSES } from "../labels";

export const pitchInputSchema = z.object({
  opportunityId: z.string({ message: "Choose the opportunity" }).min(1, "Choose the opportunity").max(40),
  deadline: zBangkokDateTime,
  ownerId: zOptId,
  format: z.enum(PITCH_FORMATS).default("WRITTEN"),
  status: z.enum(PITCH_STATUSES).default("DRAFTING"),
  notes: zOptText(5000),
});
export type PitchInput = z.infer<typeof pitchInputSchema>;

export const checklistLabelSchema = z.object({ label: zText(200, "Enter an item") });
