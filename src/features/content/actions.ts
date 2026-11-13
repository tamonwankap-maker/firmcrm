"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requestIp, requireUser } from "@/server/auth/current-user";
import { formToObject, runAction, type ActionResult } from "@/server/actions/result";
import { contentInputSchema } from "./schema";
import { createContent, setContentArchived, updateContent } from "./service";

export async function createContentAction(_prev: ActionResult | null, form: FormData): Promise<ActionResult> {
  const result = await runAction(async () => {
    const me = await requireUser();
    await createContent(me, contentInputSchema.parse(formToObject(form)), { userId: me.id, ip: await requestIp() });
    return { ok: true, message: "Added to the content pipeline." };
  });
  if (result.ok) revalidatePath("/", "layout");
  return result;
}

export async function updateContentAction(
  id: string,
  _prev: ActionResult | null,
  form: FormData,
): Promise<ActionResult> {
  const result = await runAction(async () => {
    const me = await requireUser();
    await updateContent(me, id, contentInputSchema.parse(formToObject(form)), { userId: me.id, ip: await requestIp() });
    return { ok: true };
  });
  if (result.ok) {
    revalidatePath("/", "layout");
    redirect("/content");
  }
  return result;
}

export async function setContentArchivedAction(id: string, archived: boolean): Promise<ActionResult> {
  const result = await runAction(async () => {
    const me = await requireUser();
    await setContentArchived(me, id, archived, { userId: me.id, ip: await requestIp() });
    return { ok: true, message: archived ? "Archived." : "Restored." };
  });
  revalidatePath("/", "layout");
  return result;
}
