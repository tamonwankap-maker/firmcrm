"use server";

import { AuthError } from "next-auth";
import { redirect } from "next/navigation";
import { z } from "zod";
import { signIn, signOut } from "@/server/auth/config";
import { getCurrentUser, requestIp, requireUser } from "@/server/auth/current-user";
import { hashPassword, verifyPassword } from "@/server/auth/password";
import { db } from "@/server/db";
import { withAudit } from "@/server/audit";
import { runAction, UserFacingError, type ActionResult } from "@/server/actions/result";
import { passwordSchema } from "@/lib/password-policy";

export async function loginAction(_prev: ActionResult | null, form: FormData): Promise<ActionResult> {
  const callbackUrl = String(form.get("callbackUrl") ?? "");
  const redirectTo = callbackUrl.startsWith("/") && !callbackUrl.startsWith("//") ? callbackUrl : "/dashboard";
  try {
    await signIn("credentials", {
      email: form.get("email"),
      password: form.get("password"),
      redirectTo,
    });
    return { ok: true };
  } catch (err) {
    if (err instanceof AuthError) {
      const code = (err as AuthError & { code?: string }).code;
      if (code === "rate_limited") {
        return { ok: false, error: "Too many failed attempts. Please wait 15 minutes and try again." };
      }
      return { ok: false, error: "Incorrect email or password." };
    }
    throw err; // includes the success redirect
  }
}

export async function signOutAction(): Promise<void> {
  const user = await getCurrentUser();
  if (user) {
    await withAudit({ userId: user.id, ip: await requestIp() }, async () => ({
      result: null,
      audit: [{ action: "LOGOUT", entity: "User", entityId: user.id }],
    }));
  }
  await signOut({ redirectTo: "/login" });
}

const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Enter your current password"),
    newPassword: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((v) => v.newPassword === v.confirmPassword, { path: ["confirmPassword"], message: "Passwords do not match" })
  .refine((v) => v.newPassword !== v.currentPassword, {
    path: ["newPassword"],
    message: "Choose a different password",
  });

export async function changePasswordAction(_prev: ActionResult | null, form: FormData): Promise<ActionResult> {
  const result = await runAction(async () => {
    const me = await requireUser({ allowPasswordChange: true });
    const input = changePasswordSchema.parse(Object.fromEntries(form));
    const user = await db.user.findUniqueOrThrow({ where: { id: me.id } });
    if (!user.passwordHash || !(await verifyPassword(user.passwordHash, input.currentPassword))) {
      throw new UserFacingError("Current password is incorrect.", { currentPassword: ["Incorrect password"] });
    }
    const passwordHash = await hashPassword(input.newPassword);
    await withAudit({ userId: me.id, ip: await requestIp() }, async (tx) => {
      await tx.user.update({
        where: { id: me.id },
        // Bumping sessionVersion signs out every other session too.
        data: { passwordHash, mustChangePassword: false, sessionVersion: { increment: 1 } },
      });
      return {
        result: null,
        audit: [{ action: "PASSWORD_RESET", entity: "User", entityId: me.id, meta: { self: true } }],
      };
    });
    return { ok: true };
  });
  if (result.ok) redirect("/login?changed=1");
  return result;
}
