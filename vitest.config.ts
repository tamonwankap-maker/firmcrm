import { defineConfig } from "vitest/config";
import path from "node:path";

const TEST_DATABASE_URL =
  process.env.TEST_DATABASE_URL ?? "postgresql://bdcrm:bdcrm@localhost:5432/bdcrm_test?schema=public";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
      // `server-only` throws outside React Server Components; it is a no-op under test.
      "server-only": path.resolve(__dirname, "tests/stubs/empty.ts"),
    },
  },
  test: {
    environment: "node",
    include: ["tests/unit/**/*.test.ts", "tests/integration/**/*.test.ts"],
    globalSetup: ["tests/integration/global-setup.ts"],
    // Integration tests share one database; run files one at a time.
    fileParallelism: false,
    env: {
      DATABASE_URL: TEST_DATABASE_URL,
      AUTH_SECRET: "test-secret-test-secret-test-secret-123",
      NODE_ENV: "test",
    },
  },
});
