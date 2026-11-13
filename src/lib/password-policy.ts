import { z } from "zod";

/** Firm password policy: 12+ chars, at least one letter and one number. */
export const passwordSchema = z
  .string()
  .min(12, "Password must be at least 12 characters")
  .max(200, "Password is too long")
  .regex(/[A-Za-z]/, "Password must contain a letter")
  .regex(/[0-9]/, "Password must contain a number");
