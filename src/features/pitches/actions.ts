"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requestIp, requireUser } from "@/server/auth/current-user";
import { formToObject, runAction, type ActionResult } from "@/server/actions/result";
import { checklistLabelSchema, pitchInputSchema } from "./schema";
import {
  addChecklistItem,
  createPitch,
  removeChecklistItem,
  setPitchArchived,
  toggleChecklistItem,
  updatePitch,
} from "./service";

const ctx = async (id: string) => ({ userId: id, ip: await requestIp() });

export async function createPitchAction(_prev: ActionResult | null, form: FormData): Promise<ActionResult> {
  let id: string | undefined;
  const result = await runAction(async () => {
    const me = await requireUser();
    const p = await createPitch(me, pitchInputSchema.parse(formToObject(form)), await ctx(me.id));
    id = p.id;
    return { ok: true };
  });
  if (result.ok && id) {
    revalidatePath("/", "layout");
    redirect(`/pitches/${id}`);
  }
  return result;
}

export async function updatePitchAction(id: string, _prev: ActionResult | null, form: FormData): Promise<ActionResult> {
  const result = await runAction(async () => {
    const me = await requireUser();
    const input = pitchInputSchema.omit({ opportunityId: true }).parse(formToObject(form));
    await updatePitch(me, id, input, await ctx(me.id));
    return { ok: true, message: "Pitch saved." };
  });
  if (result.ok) revalidatePath("/", "layout");
  return result;
}

export async function toggleChecklistItemAction(pitchId: string, itemId: string, done: boolean): Promise<ActionResult> {
  const result = await runAction(async () => {
    const me = await requireUser();
    await toggleChecklistItem(me, pitchId, itemId, done, await ctx(me.id));
    return { ok: true };
  });
  revalidatePath(`/pitches/${pitchId}`);
  return result;
}

export async function addChecklistItemAction(
  pitchId: string,
  _prev: ActionResult | null,
  form: FormData,
): Promise<ActionResult> {
  const result = await runAction(async () => {
    const me = await requireUser();
    const { label } = checklistLabelSchema.parse(formToObject(form));
    await addChecklistItem(me, pitchId, label, await ctx(me.id));
    return { ok: true };
  });
  revalidatePath(`/pitches/${pitchId}`);
  return result;
}

export async function removeChecklistItemAction(pitchId: string, itemId: string): Promise<ActionResult> {
  const result = await runAction(async () => {
    const me = await requireUser();
    await removeChecklistItem(me, pitchId, itemId, await ctx(me.id));
    return { ok: true };
  });
  revalidatePath(`/pitches/${pitchId}`);
  return result;
}

export async function setPitchArchivedAction(id: string, archived: boolean): Promise<ActionResult> {
  const result = await runAction(async () => {
    const me = await requireUser();
    await setPitchArchived(me, id, archived, await ctx(me.id));
    return { ok: true, message: archived ? "Pitch archived." : "Pitch restored." };
  });
  revalidatePath("/", "layout");
  return result;
}
