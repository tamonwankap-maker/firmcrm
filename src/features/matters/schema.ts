import { z } from "zod";
import { zCheckbox, zIdList, zOptId, zOptMoney, zOptText, zText } from "@/lib/zod-helpers";
import { CURRENCIES } from "../labels";

export const matterInputSchema = z
  .object({
    title: zText(300, "Enter a title"),
    clientOrganisationId: zOptId,
    clientDisplayName: zOptText(200),
    anonymised: zCheckbox,
    practiceAreaIds: zIdList(20),
    value: zOptMoney,
    currency: z.enum(CURRENCIES).default("THB"),
    year: z.coerce.number({ message: "Enter the year" }).int().min(1950, "Enter the year").max(2100),
    publishable: zCheckbox,
    confidential: zCheckbox,
    teamIds: zIdList(30),
    description: zText(20_000, "Describe the matter"),
  })
  .superRefine((v, ctx) => {
    if (v.anonymised && !v.clientDisplayName) {
      ctx.addIssue({
        code: "custom",
        path: ["clientDisplayName"],
        message: "Describe the client, e.g. “a Japanese automotive group”",
      });
    }
    if (!v.anonymised && !v.clientOrganisationId && !v.clientDisplayName) {
      ctx.addIssue({ code: "custom", path: ["clientOrganisationId"], message: "Choose the client or describe it" });
    }
    if (v.confidential && v.publishable) {
      ctx.addIssue({ code: "custom", path: ["publishable"], message: "A confidential matter cannot be publishable" });
    }
    if (v.practiceAreaIds.length === 0) {
      ctx.addIssue({ code: "custom", path: ["practiceAreaIds"], message: "Choose at least one practice area" });
    }
  });
export type MatterInput = z.infer<typeof matterInputSchema>;
