import { z } from "zod";
import { zOptDate, zOptId, zOptText, zText } from "@/lib/zod-helpers";
import { TASK_STATUSES } from "../labels";

export const taskInputSchema = z
  .object({
    title: zText(300, "Enter a title"),
    dueDate: zOptDate,
    ownerId: zOptId,
    status: z.enum(TASK_STATUSES).default("OPEN"),
    notes: zOptText(5000),
    organisationId: zOptId,
    contactId: zOptId,
    opportunityId: zOptId,
    pitchId: zOptId,
  })
  .refine((v) => [v.organisationId, v.contactId, v.opportunityId, v.pitchId].filter(Boolean).length <= 1, {
    path: ["contactId"],
    message: "Link a task to one record only",
  });

export type TaskInput = z.infer<typeof taskInputSchema>;
