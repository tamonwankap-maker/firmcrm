import { z } from "zod";

export const ROLES = ["ADMIN", "BD", "PARTNER", "VIEWER"] as const;

const checkbox = z.preprocess((v) => v === "on" || v === "true" || v === true, z.boolean());
const idList = z.preprocess((v) => (Array.isArray(v) ? v : v ? [v] : []), z.array(z.string().min(1)).max(50));

export const userInputSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(200),
  email: z.string().trim().toLowerCase().email("Enter a valid email").max(254),
  role: z.enum(ROLES),
  title: z.string().trim().max(200).optional().default(""),
  practiceAreaIds: idList,
  canLogin: checkbox,
  active: checkbox.optional(),
});

export type UserInput = z.infer<typeof userInputSchema>;
