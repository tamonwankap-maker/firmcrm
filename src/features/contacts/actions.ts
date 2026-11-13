"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requestIp, requireUser } from "@/server/auth/current-user";
import { formToObject, runAction, type ActionResult } from "@/server/actions/result";
import { contactInputSchema } from "./schema";
import { createContact, setContactArchived, updateContact } from "./service";

export async function createContactAction(_prev: ActionResult | null, form: FormData): Promise<ActionResult> {
  let id: string | undefined;
  const result = await runAction(async () => {
    const me = await requireUser();
    const c = await createContact(me, contactInputSchema.parse(formToObject(form)), {
      userId: me.id,
      ip: await requestIp(),
    });
    id = c.id;
    return { ok: true };
  });
  if (result.ok && id) {
    revalidatePath("/", "layout");
    redirect(`/contacts/${id}`);
  }
  return result;
}

export async function updateContactAction(
  id: string,
  _prev: ActionResult | null,
  form: FormData,
): Promise<ActionResult> {
  const result = await runAction(async () => {
    const me = await requireUser();
    await updateContact(me, id, contactInputSchema.parse(formToObject(form)), { userId: me.id, ip: await requestIp() });
    return { ok: true };
  });
  if (result.ok) {
    revalidatePath("/", "layout");
    redirect(`/contacts/${id}`);
  }
  return result;
}

export async function setContactArchivedAction(id: string, archived: boolean): Promise<ActionResult> {
  const result = await runAction(async () => {
    const me = await requireUser();
    await setContactArchived(me, id, archived, { userId: me.id, ip: await requestIp() });
    return { ok: true, message: archived ? "Contact archived." : "Contact restored." };
  });
  revalidatePath("/", "layout");
  return result;
}
