"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requestIp, requireUser } from "@/server/auth/current-user";
import { formToObject, runAction, type ActionResult } from "@/server/actions/result";
import { awardInputSchema } from "./schema";
import { createAward, setAwardArchived, updateAward } from "./service";

export async function createAwardAction(_prev: ActionResult | null, form: FormData): Promise<ActionResult> {
  const result = await runAction(async () => {
    const me = await requireUser();
    await createAward(me, awardInputSchema.parse(formToObject(form)), { userId: me.id, ip: await requestIp() });
    return { ok: true, message: "Award entry added." };
  });
  if (result.ok) revalidatePath("/", "layout");
  return result;
}

export async function updateAwardAction(id: string, _prev: ActionResult | null, form: FormData): Promise<ActionResult> {
  const result = await runAction(async () => {
    const me = await requireUser();
    await updateAward(me, id, awardInputSchema.parse(formToObject(form)), { userId: me.id, ip: await requestIp() });
    return { ok: true };
  });
  if (result.ok) {
    revalidatePath("/", "layout");
    redirect("/awards");
  }
  return result;
}

export async function setAwardArchivedAction(id: string, archived: boolean): Promise<ActionResult> {
  const result = await runAction(async () => {
    const me = await requireUser();
    await setAwardArchived(me, id, archived, { userId: me.id, ip: await requestIp() });
    return { ok: true, message: archived ? "Award archived." : "Award restored." };
  });
  revalidatePath("/", "layout");
  return result;
}
