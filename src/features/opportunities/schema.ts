import { z } from "zod";
import { zCheckbox, zIdList, zOptDate, zOptId, zOptMoney, zOptText, zText } from "@/lib/zod-helpers";
import { normalizeText } from "@/lib/thai";
import { CONFLICT_STATUSES, CURRENCIES, OPEN_STAGES, OPP_SOURCES, OUTCOME_REASONS, STAGES } from "../labels";

const competitors = z.preprocess(
  (v) =>
    typeof v === "string"
      ? [
          ...new Set(
            v
              .split(/[,;\n]/)
              .map((x) => normalizeText(x))
              .filter(Boolean),
          ),
        ].slice(0, 20)
      : [],
  z.array(z.string().max(120)),
);

export const opportunityInputSchema = z
  .object({
    name: zText(300, "Give the opportunity a name"),
    organisationId: z
      .string({ message: "Choose the client / prospect" })
      .min(1, "Choose the client / prospect")
      .max(40),
    source: z.enum(OPP_SOURCES, { message: "Choose a source" }),
    referrerOrgId: zOptId,
    referrerContactId: zOptId,
    practiceAreaIds: zIdList(20),
    leadPartnerId: z.string({ message: "Choose a lead partner" }).min(1, "Choose a lead partner").max(40),
    teamIds: zIdList(30),
    feeEstimateMin: zOptMoney,
    feeEstimateMax: zOptMoney,
    currency: z.enum(CURRENCIES).default("THB"),
    probability: z.coerce.number().int().min(0, "0–100").max(100, "0–100").optional(),
    /** Only used on create; later changes go through the stage dialog. */
    stage: z.enum(OPEN_STAGES).default("LEAD"),
    conflictStatus: z.enum(CONFLICT_STATUSES).default("NOT_REQUESTED"),
    expectedDecisionDate: zOptDate,
    competitors,
    confidential: zCheckbox,
  })
  .superRefine((v, ctx) => {
    if (v.feeEstimateMin && v.feeEstimateMax && Number(v.feeEstimateMin) > Number(v.feeEstimateMax)) {
      ctx.addIssue({ code: "custom", path: ["feeEstimateMax"], message: "Maximum must be at least the minimum" });
    }
    if (v.practiceAreaIds.length === 0) {
      ctx.addIssue({ code: "custom", path: ["practiceAreaIds"], message: "Choose at least one practice area" });
    }
  });
export type OpportunityInput = z.infer<typeof opportunityInputSchema>;

export const stageChangeSchema = z.object({
  stage: z.enum(STAGES),
  outcomeReason: z.preprocess((v) => (v === "" ? null : v), z.enum(OUTCOME_REASONS).nullable().optional()),
  outcome: zOptText(2000),
  closedDate: zOptDate,
  /** User accepted the warnings (e.g. conflict not cleared). */
  confirm: zCheckbox.optional(),
});
export type StageChangeInputForm = z.infer<typeof stageChangeSchema>;
