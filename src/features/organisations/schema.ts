import { z } from "zod";
import { isCountryCode } from "@/lib/countries";
import { zCheckbox, zOptId, zOptText, zOptUrl, zText } from "@/lib/zod-helpers";
import { ORG_STATUSES, ORG_TYPES } from "../labels";

export const organisationInputSchema = z.object({
  nameEn: zText(300, "English name is required"),
  nameTh: zOptText(300),
  type: z.enum(ORG_TYPES, { message: "Choose a type" }),
  status: z.enum(ORG_STATUSES).default("ACTIVE"),
  industryId: zOptId,
  country: z.string().trim().toUpperCase().refine(isCountryCode, "Choose a country").default("TH"),
  relationshipPartnerId: zOptId,
  isKeyClient: zCheckbox,
  website: zOptUrl,
  notes: zOptText(10_000),
  /** User ticked "create anyway" after a duplicate warning. */
  confirmDuplicate: zCheckbox.optional(),
});

export type OrganisationInput = z.infer<typeof organisationInputSchema>;
