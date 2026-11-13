import { execSync } from "node:child_process";
import { Client } from "pg";
import { E2E_DATABASE_URL } from "../../playwright.config";

/**
 * Prepare the dedicated e2e database: apply migrations, empty every table, seed lookups + admin + demo users.
 * Safety: refuses to run unless the database name ends in _e2e or _test.
 */
export default async function setup() {
  const dbName = new URL(E2E_DATABASE_URL).pathname.slice(1);
  if (!/_(e2e|test)$/.test(dbName))
    throw new Error(`Refusing to wipe "${dbName}": e2e database name must end in _e2e or _test.`);

  const env = {
    ...process.env,
    DATABASE_URL: E2E_DATABASE_URL,
    SEED_ADMIN_EMAIL: "admin@example.com",
    SEED_ADMIN_PASSWORD: "ChangeMe!2026",
    NODE_ENV: "development" as const,
  };
  execSync("npx prisma migrate deploy", { env, stdio: "pipe" });

  const client = new Client({ connectionString: E2E_DATABASE_URL });
  await client.connect();
  const { rows } = await client.query<{ tablename: string }>(
    "SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename <> '_prisma_migrations'",
  );
  await client.query(`TRUNCATE ${rows.map((r) => `"${r.tablename}"`).join(", ")} CASCADE`);
  await client.end();

  execSync("npx tsx prisma/seed.ts --demo", { env, stdio: "pipe" });
}
