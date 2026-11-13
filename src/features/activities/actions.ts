"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requestIp, requireUser } from "@/server/auth/current-user";
import { formToObject, runAction, type ActionResult } from "@/server/actions/result";
import { activityInputSchema } from "./schema";
import { createActivity, setActivityArchived, setNextActionDone, updateActivity } from "./service";

/** Only allow returning to an in-app path. */
function safeReturn(v: FormDataEntryValue | null, fallback: string) {
  const s = typeof v === "string" ? v : "";
  return s.startsWith("/") && !s.startsWith("//") ? s : fallback;
}

export async function createActivityAction(_prev: ActionResult | null, form: FormData): Promise<ActionResult> {
  const back = safeReturn(form.get("returnTo"), "/activities");
  const result = await runAction(async () => {
    const me = await requireUser();
    await createActivity(me, activityInputSchema.parse(formToObject(form)), { userId: me.id, ip: await requestIp() });
    return { ok: true };
  });
  if (result.ok) {
    revalidatePath("/", "layout");
    redirect(back);
  }
  return result;
}

export async function updateActivityAction(
  id: string,
  _prev: ActionResult | null,
  form: FormData,
): Promise<ActionResult> {
  const back = safeReturn(form.get("returnTo"), "/activities");
  const result = await runAction(async () => {
    const me = await requireUser();
    await updateActivity(me, id, activityInputSchema.parse(formToObject(form)), {
      userId: me.id,
      ip: await requestIp(),
    });
    return { ok: true };
  });
  if (result.ok) {
    revalidatePath("/", "layout");
    redirect(back);
  }
  return result;
}

export async function setNextActionDoneAction(id: string, done: boolean): Promise<ActionResult> {
  const result = await runAction(async () => {
    const me = await requireUser();
    await setNextActionDone(me, id, done, { userId: me.id, ip: await requestIp() });
    return { ok: true, message: done ? "Next action marked done." : "Next action reopened." };
  });
  revalidatePath("/", "layout");
  return result;
}

export async function setActivityArchivedAction(id: string, archived: boolean): Promise<ActionResult> {
  const result = await runAction(async () => {
    const me = await requireUser();
    await setActivityArchived(me, id, archived, { userId: me.id, ip: await requestIp() });
    return { ok: true, message: archived ? "Activity archived." : "Activity restored." };
  });
  revalidatePath("/", "layout");
  return result;
}
