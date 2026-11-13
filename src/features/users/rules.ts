/**
 * Business rules for user management (pure; unit-tested).
 */
import type { Role } from "@/server/auth/policy";

export interface UserSnapshot {
  id: string;
  role: Role;
  active: boolean;
  canLogin: boolean;
}

/**
 * Guard against an admin locking the firm out:
 *  - you cannot remove your own ADMIN role or deactivate yourself;
 *  - the last active ADMIN who can log in cannot be demoted/deactivated.
 * Returns an error message, or null if allowed.
 */
export function checkAdminLockout(params: {
  actorId: string;
  before: UserSnapshot;
  after: Pick<UserSnapshot, "role" | "active" | "canLogin">;
  otherActiveAdmins: number;
}): string | null {
  const { actorId, before, after, otherActiveAdmins } = params;
  const wasAdmin = before.role === "ADMIN" && before.active && before.canLogin;
  const staysAdmin = after.role === "ADMIN" && after.active && after.canLogin;
  if (!wasAdmin || staysAdmin) return null;
  if (before.id === actorId) return "You cannot remove your own admin access or deactivate yourself.";
  if (otherActiveAdmins === 0) return "At least one active admin is required.";
  return null;
}

/** Changes that must sign the user out everywhere. */
export function requiresSessionRevoke(
  before: Pick<UserSnapshot, "role" | "active" | "canLogin">,
  after: Pick<UserSnapshot, "role" | "active" | "canLogin">,
): boolean {
  return before.role !== after.role || (before.active && !after.active) || (before.canLogin && !after.canLogin);
}
