import { z } from "zod";
import { zDate, zOptDate, zOptText } from "@/lib/zod-helpers";
import { CONSENT_SOURCES, MAILING_LISTS } from "../labels";

/**
 * PDPA consent record for one mailing list.
 * - status "IN": opted in on consentDate (source + evidence).
 * - status "OUT": declined or withdrawn; withdrawnDate defaults to today.
 */
export const consentInputSchema = z
  .object({
    contactId: z.string().min(1).max(40),
    list: z.enum(MAILING_LISTS),
    status: z.enum(["IN", "OUT"]),
    consentDate: zDate,
    withdrawnDate: zOptDate,
    source: z.enum(CONSENT_SOURCES),
    evidenceNote: zOptText(2000),
  })
  .superRefine((v, ctx) => {
    if (v.status === "OUT" && v.withdrawnDate && v.withdrawnDate < v.consentDate) {
      ctx.addIssue({
        code: "custom",
        path: ["withdrawnDate"],
        message: "Withdrawal cannot be before the consent date",
      });
    }
  });

export type ConsentInput = z.infer<typeof consentInputSchema>;
