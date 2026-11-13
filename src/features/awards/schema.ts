import { z } from "zod";
import { zIdList, zOptDate, zOptId, zOptText, zText } from "@/lib/zod-helpers";
import { AWARD_STATUSES } from "../labels";

export const awardInputSchema = z.object({
  name: zText(200, "Enter the award name"),
  organiser: zOptText(200),
  category: zText(300, "Enter the category"),
  year: z.coerce.number({ message: "Enter the year" }).int().min(2000, "Enter the year").max(2100),
  deadline: zOptDate,
  ownerId: zOptId,
  practiceAreaIds: zIdList(20),
  status: z.enum(AWARD_STATUSES).default("ENTERED"),
  notes: zOptText(5000),
});
export type AwardInput = z.infer<typeof awardInputSchema>;
