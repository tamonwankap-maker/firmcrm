"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requestIp, requireUser } from "@/server/auth/current-user";
import { formToObject, runAction, type ActionResult } from "@/server/actions/result";
import { matterInputSchema } from "./schema";
import { createMatter, setMatterArchived, updateMatter } from "./service";

export async function createMatterAction(_prev: ActionResult | null, form: FormData): Promise<ActionResult> {
  let id: string | undefined;
  const result = await runAction(async () => {
    const me = await requireUser();
    id = (await createMatter(me, matterInputSchema.parse(formToObject(form)), { userId: me.id, ip: await requestIp() }))
      .id;
    return { ok: true };
  });
  if (result.ok && id) {
    revalidatePath("/", "layout");
    redirect(`/matters/${id}`);
  }
  return result;
}

export async function updateMatterAction(
  id: string,
  _prev: ActionResult | null,
  form: FormData,
): Promise<ActionResult> {
  const result = await runAction(async () => {
    const me = await requireUser();
    await updateMatter(me, id, matterInputSchema.parse(formToObject(form)), { userId: me.id, ip: await requestIp() });
    return { ok: true };
  });
  if (result.ok) {
    revalidatePath("/", "layout");
    redirect(`/matters/${id}`);
  }
  return result;
}

export async function setMatterArchivedAction(id: string, archived: boolean): Promise<ActionResult> {
  const result = await runAction(async () => {
    const me = await requireUser();
    await setMatterArchived(me, id, archived, { userId: me.id, ip: await requestIp() });
    return { ok: true, message: archived ? "Matter archived." : "Matter restored." };
  });
  revalidatePath("/", "layout");
  return result;
}
