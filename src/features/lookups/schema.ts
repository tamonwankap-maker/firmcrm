import { z } from "zod";

export const LOOKUP_KINDS = ["practiceArea", "industry", "directory"] as const;
export type LookupKind = (typeof LOOKUP_KINDS)[number];

export const LOOKUP_LABELS: Record<LookupKind, { title: string; singular: string; entity: string }> = {
  practiceArea: { title: "Practice areas", singular: "practice area", entity: "PracticeArea" },
  industry: { title: "Industries", singular: "industry", entity: "Industry" },
  directory: { title: "Directories", singular: "directory", entity: "Directory" },
};

export const lookupInputSchema = z.object({
  kind: z.enum(LOOKUP_KINDS),
  name: z.string().trim().min(1, "Name is required").max(120),
});
