import { z } from "zod";

const schema = z.object({
  DATABASE_URL: z.string().url(),
  AUTH_SECRET: z.string().min(32, "AUTH_SECRET must be at least 32 characters"),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
});

export type Env = z.infer<typeof schema>;

let cached: Env | undefined;

/**
 * Validated environment. Parsed lazily (not at import) so `next build` works without secrets;
 * src/instrumentation.ts calls this at server start so a misconfigured server fails fast.
 */
export function getEnv(): Env {
  cached ??= schema.parse(process.env);
  return cached;
}
