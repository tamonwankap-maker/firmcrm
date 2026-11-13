"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requestIp, requireUser } from "@/server/auth/current-user";
import { formToObject, runAction, type ActionResult } from "@/server/actions/result";
import { organisationInputSchema } from "./schema";
import { createOrganisation, setOrganisationArchived, updateOrganisation } from "./service";

export async function createOrganisationAction(_prev: ActionResult | null, form: FormData): Promise<ActionResult> {
  let id: string | undefined;
  const result = await runAction(async () => {
    const me = await requireUser();
    const input = organisationInputSchema.parse(formToObject(form));
    const org = await createOrganisation(me, input, { userId: me.id, ip: await requestIp() });
    id = org.id;
    return { ok: true };
  });
  if (result.ok && id) {
    revalidatePath("/organisations");
    redirect(`/organisations/${id}`);
  }
  return result;
}

export async function updateOrganisationAction(
  id: string,
  _prev: ActionResult | null,
  form: FormData,
): Promise<ActionResult> {
  const result = await runAction(async () => {
    const me = await requireUser();
    const input = organisationInputSchema.parse(formToObject(form));
    await updateOrganisation(me, id, input, { userId: me.id, ip: await requestIp() });
    return { ok: true };
  });
  if (result.ok) {
    revalidatePath("/organisations");
    redirect(`/organisations/${id}`);
  }
  return result;
}

export async function setOrganisationArchivedAction(id: string, archived: boolean): Promise<ActionResult> {
  const result = await runAction(async () => {
    const me = await requireUser();
    await setOrganisationArchived(me, id, archived, { userId: me.id, ip: await requestIp() });
    return { ok: true, message: archived ? "Archived." : "Restored." };
  });
  revalidatePath("/organisations");
  revalidatePath(`/organisations/${id}`);
  return result;
}
