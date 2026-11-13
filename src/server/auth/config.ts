import "server-only";
import NextAuth, { CredentialsSignin, type DefaultSession } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { z } from "zod";
import { db } from "@/server/db";
import { verifyPassword } from "./password";
import { isLoginBlocked } from "./rate-limit";

declare module "next-auth" {
  interface Session {
    user: { id: string } & DefaultSession["user"];
    sessionVersion: number;
  }
  interface User {
    sessionVersion?: number;
  }
}

declare module "@auth/core/jwt" {
  interface JWT {
    uid?: string;
    sv?: number;
  }
}

class RateLimitedSignin extends CredentialsSignin {
  code = "rate_limited";
}

const credentialsSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(1).max(200),
});

function clientIp(request: Request): string | null {
  const fwd = request.headers.get("x-forwarded-for");
  return fwd?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || null;
}

/**
 * Auth.js configuration.
 * Today: email + password (Credentials). To add Microsoft Entra ID SSO later, add
 * `MicrosoftEntraID({...})` to providers and, in a `signIn` callback, allow only emails
 * that already exist as active User rows (see PLAN.md §1).
 */
export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: "jwt", maxAge: 60 * 60 * 10 }, // 10-hour working day
  pages: { signIn: "/login" },
  trustHost: true,
  providers: [
    Credentials({
      credentials: { email: {}, password: {} },
      async authorize(raw, request) {
        const parsed = credentialsSchema.safeParse(raw);
        if (!parsed.success) return null;
        const { email, password } = parsed.data;
        const ip = clientIp(request);

        if (await isLoginBlocked(email, ip)) throw new RateLimitedSignin();

        const user = await db.user.findUnique({ where: { email } });
        const ok =
          !!user?.passwordHash && user.active && user.canLogin && (await verifyPassword(user.passwordHash, password));

        await db.$transaction([
          db.loginAttempt.create({ data: { email, ip, success: ok } }),
          db.auditLog.create({
            data: {
              userId: user?.id ?? null,
              action: ok ? "LOGIN" : "LOGIN_FAILED",
              entity: "User",
              entityId: user?.id ?? null,
              diff: ok ? undefined : { _meta: { email } },
              ip,
            },
          }),
          ...(ok && user ? [db.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } })] : []),
        ]);

        if (!ok || !user) return null;
        return { id: user.id, name: user.name, email: user.email, sessionVersion: user.sessionVersion };
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user?.id) {
        token.uid = user.id;
        token.sv = user.sessionVersion ?? 0;
      }
      return token;
    },
    session({ session, token }) {
      if (token.uid) session.user.id = token.uid;
      session.sessionVersion = token.sv ?? 0;
      return session;
    },
  },
});
