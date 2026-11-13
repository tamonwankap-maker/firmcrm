import { z } from "zod";

import { STAGES } from "../labels";

export { STAGES, STAGE_LABELS } from "../labels";

const pct = z.coerce.number().int().min(0).max(100);

export const settingsSchema = z.object({
  usdToThbRate: z.coerce.number().positive("Must be greater than 0").max(1000),
  stageDefaultProbability: z.object(
    Object.fromEntries(STAGES.map((s) => [s, pct])) as Record<(typeof STAGES)[number], typeof pct>,
  ),
});

export type Settings = z.infer<typeof settingsSchema>;

export const DEFAULT_SETTINGS: Settings = {
  usdToThbRate: 35,
  stageDefaultProbability: {
    LEAD: 10,
    QUALIFIED: 25,
    PROPOSAL_PREPARING: 40,
    SUBMITTED: 60,
    WON: 100,
    LOST: 0,
    ON_HOLD: 10,
  },
};
