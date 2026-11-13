/**
 * Break-glass: give an existing user (or a new one) ADMIN access with a temporary password.
 * For IT, when no admin can sign in. Audited as PASSWORD_RESET with meta { via: "server script" }.
 *
 *   docker compose exec -w /app/tools app ./node_modules/.bin/tsx prisma/admin-reset.ts head.of.bd@yourfirm.com
 */
import "dotenv/config";
import { randomBytes } from "node:crypto";
import { hash } from "@node-rs/argon2";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { ARGON2_OPTIONS } from "../src/server/auth/argon";

async function main() {
  const email = process.argv[2]?.trim().toLowerCase();
  if (!email || !/^[^@\s]+@[^@\s]+$/.test(email)) {
    console.error("Usage: tsx prisma/admin-reset.ts <email>");
    process.exit(1);
  }
  const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }) });
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
  const temp = Array.from(randomBytes(16), (b) => alphabet[b % alphabet.length]).join("");
  const passwordHash = await hash(temp, ARGON2_OPTIONS);
  await db.$transaction(async (tx) => {
    const existing = await tx.user.findUnique({ where: { email } });
    const user = existing
      ? await tx.user.update({
          where: { email },
          data: {
            role: "ADMIN",
            active: true,
            canLogin: true,
            passwordHash,
            mustChangePassword: true,
            sessionVersion: { increment: 1 },
          },
        })
      : await tx.user.create({ data: { email, name: email, role: "ADMIN", passwordHash, mustChangePassword: true } });
    await tx.auditLog.create({
      data: {
        userId: null,
        action: "PASSWORD_RESET",
        entity: "User",
        entityId: user.id,
        diff: { _meta: { via: "server script", madeAdmin: true, created: !existing } },
      },
    });
  });
  await db.$disconnect();
  console.log(`✓ ${email} is an active admin. Temporary password (change at first sign-in): ${temp}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
