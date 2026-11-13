import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";
import type { Role } from "@/server/auth/policy";

export const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }) });

/** Wipe all data (AuditLog trigger is bypassed by TRUNCATE, which is intended for tests only). */
export async function resetDb() {
  const dbName = new URL(process.env.DATABASE_URL!).pathname.slice(1);
  if (!/_(e2e|test)$/.test(dbName)) throw new Error(`Refusing to wipe "${dbName}": not a test database.`);
  const tables = await db.$queryRaw<{ tablename: string }[]>`
    SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename <> '_prisma_migrations'`;
  await db.$executeRawUnsafe(`TRUNCATE ${tables.map((t) => `"${t.tablename}"`).join(", ")} CASCADE`);
}

let n = 0;
export async function makeUser(role: Role, name = `${role} user ${++n}`) {
  return db.user.create({ data: { name, email: `${role.toLowerCase()}${++n}@test.local`, role } });
}

export async function makeOrg(nameEn = "Acme Co., Ltd.", nameTh: string | null = null) {
  return db.organisation.create({ data: { nameEn, nameTh, type: "CLIENT" } });
}
