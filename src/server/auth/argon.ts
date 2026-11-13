// Shared by the app and the seed script (no "server-only" import so tsx can load it).
/** OWASP-recommended Argon2id parameters (19 MiB, 2 iterations). */
export const ARGON2_OPTIONS = { memoryCost: 19456, timeCost: 2, parallelism: 1 } as const;
