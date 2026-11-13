"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requestIp, requireUser } from "@/server/auth/current-user";
import { formToObject, runAction, type ActionResult } from "@/server/actions/result";
import { getSettings } from "../settings/queries";
import { opportunityInputSchema, stageChangeSchema } from "./schema";
import { changeStage, createOpportunity, setOpportunityArchived, updateOpportunity } from "./service";

export async function createOpportunityAction(_prev: ActionResult | null, form: FormData): Promise<ActionResult> {
  let id: string | undefined;
  const result = await runAction(async () => {
    const me = await requireUser();
    const o = await createOpportunity(me, opportunityInputSchema.parse(formToObject(form)), await getSettings(), {
      userId: me.id,
      ip: await requestIp(),
    });
    id = o.id;
    return { ok: true };
  });
  if (result.ok && id) {
    revalidatePath("/", "layout");
    redirect(`/opportunities/${id}`);
  }
  return result;
}

export async function updateOpportunityAction(
  id: string,
  _prev: ActionResult | null,
  form: FormData,
): Promise<ActionResult> {
  const result = await runAction(async () => {
    const me = await requireUser();
    await updateOpportunity(me, id, opportunityInputSchema.parse(formToObject(form)), {
      userId: me.id,
      ip: await requestIp(),
    });
    return { ok: true };
  });
  if (result.ok) {
    revalidatePath("/", "layout");
    redirect(`/opportunities/${id}`);
  }
  return result;
}

export async function changeStageAction(id: string, _prev: ActionResult | null, form: FormData): Promise<ActionResult> {
  const result = await runAction(async () => {
    const me = await requireUser();
    const input = stageChangeSchema.parse(formToObject(form));
    await changeStage(me, id, input, await getSettings(), { userId: me.id, ip: await requestIp() });
    return { ok: true, message: "Stage updated." };
  });
  if (result.ok) revalidatePath("/", "layout");
  return result;
}

export async function setOpportunityArchivedAction(id: string, archived: boolean): Promise<ActionResult> {
  const result = await runAction(async () => {
    const me = await requireUser();
    await setOpportunityArchived(me, id, archived, { userId: me.id, ip: await requestIp() });
    return { ok: true, message: archived ? "Opportunity archived." : "Opportunity restored." };
  });
  revalidatePath("/", "layout");
  return result;
}
