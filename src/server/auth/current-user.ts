import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { db } from "@/server/db";
import { auth } from "./config";
import { ForbiddenError, type Actor, type Role } from "./policy";

export interface CurrentUser extends Actor {
  name: string;
  email: string;
  mustChangePassword: boolean;
}

/**
 * Load the signed-in user FRESH from the database (once per request).
 * Returns null if not signed in, deactivated, login disabled, or the session was revoked
 * (sessionVersion bumped by a role change / password reset / deactivation).
 */
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const session = await auth();
  const id = session?.user?.id;
  if (!id) return null;
  const user = await db.user.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      active: true,
      canLogin: true,
      sessionVersion: true,
      mustChangePassword: true,
    },
  });
  if (!user || !user.active || !user.canLogin) return null;
  if (user.sessionVersion !== session.sessionVersion) return null;
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    mustChangePassword: user.mustChangePassword,
  };
});

/** Use at the top of every page, server action and route handler. Redirects to /login if not signed in. */
export async function requireUser(opts: { allowPasswordChange?: boolean } = {}): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.mustChangePassword && !opts.allowPasswordChange) redirect("/account/password");
  return user;
}

/** Require one of the given roles; throws ForbiddenError otherwise. */
export async function requireRole(...roles: Role[]): Promise<CurrentUser> {
  const user = await requireUser();
  if (!roles.includes(user.role)) throw new ForbiddenError();
  return user;
}

/** Best-effort client IP for the audit log. */
export async function requestIp(): Promise<string | null> {
  const h = await headers();
  return h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || null;
}
