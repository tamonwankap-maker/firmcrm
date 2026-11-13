"use server";

import { revalidatePath } from "next/cache";
import { requestIp, requireUser } from "@/server/auth/current-user";
import { assertCan } from "@/server/auth/policy";
import { generateTemporaryPassword, hashPassword } from "@/server/auth/password";
import { withAudit } from "@/server/audit";
import { formToObject, runAction, UserFacingError, type ActionResult } from "@/server/actions/result";
import { normalizeText } from "@/lib/thai";
import { omit } from "@/lib/omit";
import { userInputSchema } from "./schema";
import { checkAdminLockout, requiresSessionRevoke } from "./rules";

export async function createUserAction(
  _prev: ActionResult<{ id: string; tempPassword?: string }> | null,
  form: FormData,
): Promise<ActionResult<{ id: string; tempPassword?: string }>> {
  return runAction(async () => {
    const me = await requireUser();
    assertCan(me, "create", "User");
    const input = userInputSchema.parse(formToObject(form));

    const tempPassword = input.canLogin ? generateTemporaryPassword() : undefined;
    const passwordHash = tempPassword ? await hashPassword(tempPassword) : null;

    const created = await withAudit({ userId: me.id, ip: await requestIp() }, async (tx) => {
      const user = await tx.user.create({
        data: {
          name: normalizeText(input.name),
          email: input.email,
          role: input.role,
          title: input.title ? normalizeText(input.title) : null,
          canLogin: input.canLogin,
          passwordHash,
          mustChangePassword: input.canLogin,
          practiceAreas: { connect: input.practiceAreaIds.map((id) => ({ id })) },
        },
      });
      return {
        result: user,
        audit: [
          {
            action: "CREATE",
            entity: "User",
            entityId: user.id,
            after: { ...omit(user, ["passwordHash"]), practiceAreaIds: input.practiceAreaIds },
          },
        ],
      };
    });
    revalidatePath("/admin/users");
    return { ok: true, data: { id: created.id, tempPassword } };
  });
}

export async function updateUserAction(
  userId: string,
  _prev: ActionResult | null,
  form: FormData,
): Promise<ActionResult> {
  return runAction(async () => {
    const me = await requireUser();
    assertCan(me, "update", "User");
    const input = userInputSchema.parse(formToObject(form));
    const active = input.active ?? false;

    await withAudit({ userId: me.id, ip: await requestIp() }, async (tx) => {
      const before = await tx.user.findUniqueOrThrow({
        where: { id: userId },
        include: { practiceAreas: { select: { id: true } } },
      });
      const otherActiveAdmins = await tx.user.count({
        where: { role: "ADMIN", active: true, canLogin: true, id: { not: userId } },
      });
      const lockout = checkAdminLockout({
        actorId: me.id,
        before,
        after: { role: input.role, active, canLogin: input.canLogin },
        otherActiveAdmins,
      });
      if (lockout) throw new UserFacingError(lockout);

      const revoke = requiresSessionRevoke(before, { role: input.role, active, canLogin: input.canLogin });
      // Enabling login for someone who never had a password: they need an admin reset first.
      const after = await tx.user.update({
        where: { id: userId },
        data: {
          name: normalizeText(input.name),
          email: input.email,
          role: input.role,
          title: input.title ? normalizeText(input.title) : null,
          active,
          canLogin: input.canLogin,
          sessionVersion: revoke ? { increment: 1 } : undefined,
          practiceAreas: { set: input.practiceAreaIds.map((id) => ({ id })) },
        },
        include: { practiceAreas: { select: { id: true } } },
      });

      const snap = (u: typeof before) => ({
        ...omit(u, ["passwordHash", "practiceAreas", "sessionVersion", "lastLoginAt"]),
        practiceAreaIds: u.practiceAreas.map((p) => p.id).sort(),
      });
      return {
        result: null,
        audit: [{ action: "UPDATE", entity: "User", entityId: userId, before: snap(before), after: snap(after) }],
      };
    });
    revalidatePath("/admin/users");
    revalidatePath(`/admin/users/${userId}`);
    return { ok: true, message: "User saved." };
  });
}

export async function resetPasswordAction(
  userId: string,
  _prev: ActionResult<{ tempPassword: string }> | null,
): Promise<ActionResult<{ tempPassword: string }>> {
  return runAction(async () => {
    const me = await requireUser();
    assertCan(me, "update", "User");
    if (userId === me.id) throw new UserFacingError("Use “Change password” to change your own password.");
    const tempPassword = generateTemporaryPassword();
    const passwordHash = await hashPassword(tempPassword);
    await withAudit({ userId: me.id, ip: await requestIp() }, async (tx) => {
      await tx.user.update({
        where: { id: userId },
        data: { passwordHash, mustChangePassword: true, canLogin: true, sessionVersion: { increment: 1 } },
      });
      return { result: null, audit: [{ action: "PASSWORD_RESET", entity: "User", entityId: userId }] };
    });
    revalidatePath(`/admin/users/${userId}`);
    return { ok: true, data: { tempPassword } };
  });
}
