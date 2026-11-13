import { z } from "zod";
import { zIdList, zOptDate, zOptText, zOptUrl, zText } from "@/lib/zod-helpers";
import { CONTENT_STATUSES, CONTENT_TYPES } from "../labels";

export const contentInputSchema = z
  .object({
    title: zText(300, "Enter a title"),
    type: z.enum(CONTENT_TYPES, { message: "Choose a type" }),
    channel: zOptText(200),
    status: z.enum(CONTENT_STATUSES).default("IDEA"),
    publishDate: zOptDate,
    url: zOptUrl,
    engagementNotes: zOptText(5000),
    authorIds: zIdList(20),
    practiceAreaIds: zIdList(20),
  })
  .superRefine((v, ctx) => {
    if (v.status === "PUBLISHED" && !v.publishDate) {
      ctx.addIssue({ code: "custom", path: ["publishDate"], message: "Enter the publication date" });
    }
    if (v.authorIds.length === 0)
      ctx.addIssue({ code: "custom", path: ["authorIds"], message: "Add at least one author" });
  });
export type ContentInput = z.infer<typeof contentInputSchema>;
