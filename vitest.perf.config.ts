import { defineConfig } from "vitest/config";
import path from "node:path";

/** Performance checks against a bulk-loaded database (see docs/PERFORMANCE.md). Not part of `npm test`. */
export default defineConfig({
  resolve: {
    alias: { "@": path.resolve(__dirname, "src"), "server-only": path.resolve(__dirname, "tests/stubs/empty.ts") },
  },
  test: {
    include: ["tests/perf/**/*.perf.ts"],
    testTimeout: 120_000,
    env: {
      DATABASE_URL: process.env.PERF_DATABASE_URL ?? "postgresql://bdcrm:bdcrm@localhost:5432/bdcrm_perf?schema=public",
      AUTH_SECRET: "perf-secret-perf-secret-perf-secret-1234",
      NODE_ENV: "test",
    },
  },
});
