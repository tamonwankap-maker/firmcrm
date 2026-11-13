import { defineConfig, devices } from "@playwright/test";

const PORT = 3100;
export const E2E_DATABASE_URL =
  process.env.E2E_DATABASE_URL ?? "postgresql://bdcrm:bdcrm@localhost:5432/bdcrm_e2e?schema=public";

export default defineConfig({
  testDir: "tests/e2e",
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: [["list"]],
  // First visit to each route compiles it in dev mode, which can take several seconds.
  timeout: 60_000,
  globalSetup: "./tests/e2e/global-setup.ts",
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: "off",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: `npx next dev -p ${PORT}`,
    port: PORT,
    reuseExistingServer: false,
    timeout: 120_000,
    env: {
      DATABASE_URL: E2E_DATABASE_URL,
      AUTH_SECRET: "e2e-secret-e2e-secret-e2e-secret-1234",
      AUTH_URL: `http://localhost:${PORT}`,
      NEXT_DIST_DIR: ".next-e2e",
    },
  },
});
