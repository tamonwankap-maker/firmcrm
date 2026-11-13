"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requestIp, requireUser } from "@/server/auth/current-user";
import { formToObject, runAction, type ActionResult } from "@/server/actions/result";
import { clientPlanInputSchema } from "./schema";
import { createClientPlan, setClientPlanArchived, updateClientPlan } from "./service";

export async function createClientPlanAction(_prev: ActionResult | null, form: FormData): Promise<ActionResult> {
  let id: string | undefined;
  const result = await runAction(async () => {
    const me = await requireUser();
    id = (
      await createClientPlan(me, clientPlanInputSchema.parse(formToObject(form)), {
        userId: me.id,
        ip: await requestIp(),
      })
    ).id;
    return { ok: true };
  });
  if (result.ok && id) {
    revalidatePath("/", "layout");
    redirect(`/client-plans/${id}`);
  }
  return result;
}

export async function updateClientPlanAction(
  id: string,
  _prev: ActionResult | null,
  form: FormData,
): Promise<ActionResult> {
  const result = await runAction(async () => {
    const me = await requireUser();
    const input = clientPlanInputSchema.omit({ organisationId: true, year: true }).parse(formToObject(form));
    await updateClientPlan(me, id, input, { userId: me.id, ip: await requestIp() });
    return { ok: true, message: "Plan saved." };
  });
  if (result.ok) revalidatePath("/", "layout");
  return result;
}

export async function setClientPlanArchivedAction(id: string, archived: boolean): Promise<ActionResult> {
  const result = await runAction(async () => {
    const me = await requireUser();
    await setClientPlanArchived(me, id, archived, { userId: me.id, ip: await requestIp() });
    return { ok: true, message: archived ? "Plan archived." : "Plan restored." };
  });
  revalidatePath("/", "layout");
  return result;
}
