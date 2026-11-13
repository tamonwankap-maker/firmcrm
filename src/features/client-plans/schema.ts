import { z } from "zod";
import { zIdList, zOptDate, zOptId, zText } from "@/lib/zod-helpers";

export const clientPlanInputSchema = z.object({
  organisationId: z.string({ message: "Choose the client" }).min(1, "Choose the client").max(40),
  year: z.coerce.number({ message: "Enter the year" }).int().min(2000).max(2100),
  objectives: zText(20_000, "Write the objectives for the year"),
  crossSellTargetIds: zIdList(20),
  reviewMeetingDate: zOptDate,
  healthScore: z.coerce.number().int().min(1).max(5).default(3),
  ownerId: zOptId,
});
export type ClientPlanInput = z.infer<typeof clientPlanInputSchema>;
