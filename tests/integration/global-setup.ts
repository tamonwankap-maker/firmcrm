import { execSync } from "node:child_process";

/** Apply migrations to the test database before any test runs. */
export default function setup() {
  const url = process.env.TEST_DATABASE_URL ?? "postgresql://bdcrm:bdcrm@localhost:5432/bdcrm_test?schema=public";
  execSync("npx prisma migrate deploy", { env: { ...process.env, DATABASE_URL: url }, stdio: "pipe" });
}
