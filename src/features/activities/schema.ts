import { z } from "zod";
import { zIdList, zOptDate, zOptId, zOptMoney, zOptText, zDate, zText } from "@/lib/zod-helpers";
import { ACTIVITY_TYPES, CURRENCIES } from "../labels";

export const activityInputSchema = z
  .object({
    type: z.enum(ACTIVITY_TYPES, { message: "Choose a type" }),
    date: zDate,
    organisationId: zOptId,
    opportunityId: zOptId,
    contactIds: zIdList(50),
    attendeeIds: zIdList(50),
    practiceAreaIds: zIdList(20),
    summary: zText(10_000, "Write a short summary"),
    nextAction: zOptText(1000),
    nextActionDue: zOptDate,
    ownerId: zOptId,
    giftValue: zOptMoney,
    giftCurrency: z.enum(CURRENCIES).default("THB"),
  })
  .superRefine((v, ctx) => {
    if (v.nextActionDue && !v.nextAction) {
      ctx.addIssue({
        code: "custom",
        path: ["nextAction"],
        message: "Describe the next action, or clear the due date",
      });
    }
    if (v.giftValue && v.type !== "GIFT") {
      ctx.addIssue({ code: "custom", path: ["giftValue"], message: "Gift value only applies to gifts" });
    }
    if (!v.organisationId && !v.opportunityId && v.contactIds.length === 0) {
      ctx.addIssue({ code: "custom", path: ["contactIds"], message: "Link at least one contact or an organisation" });
    }
  });

export type ActivityInput = z.infer<typeof activityInputSchema>;
