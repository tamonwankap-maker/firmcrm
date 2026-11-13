"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requestIp, requireUser } from "@/server/auth/current-user";
import { formToObject, runAction, type ActionResult } from "@/server/actions/result";
import { addInvitesSchema, eventInputSchema, inviteUpdateSchema, type InviteUpdate } from "./schema";
import { addInvites, createEvent, removeInvite, setEventArchived, updateEvent, updateInvite } from "./service";

const ctx = async (userId: string) => ({ userId, ip: await requestIp() });

export async function createEventAction(_prev: ActionResult | null, form: FormData): Promise<ActionResult> {
  let id: string | undefined;
  const result = await runAction(async () => {
    const me = await requireUser();
    id = (await createEvent(me, eventInputSchema.parse(formToObject(form)), await ctx(me.id))).id;
    return { ok: true };
  });
  if (result.ok && id) {
    revalidatePath("/", "layout");
    redirect(`/events/${id}`);
  }
  return result;
}

export async function updateEventAction(id: string, _prev: ActionResult | null, form: FormData): Promise<ActionResult> {
  const result = await runAction(async () => {
    const me = await requireUser();
    await updateEvent(me, id, eventInputSchema.parse(formToObject(form)), await ctx(me.id));
    return { ok: true, message: "Event saved." };
  });
  if (result.ok) revalidatePath("/", "layout");
  return result;
}

export async function setEventArchivedAction(id: string, archived: boolean): Promise<ActionResult> {
  const result = await runAction(async () => {
    const me = await requireUser();
    await setEventArchived(me, id, archived, await ctx(me.id));
    return { ok: true, message: archived ? "Event archived." : "Event restored." };
  });
  revalidatePath("/", "layout");
  return result;
}

export async function addInvitesAction(
  eventId: string,
  _prev: ActionResult | null,
  form: FormData,
): Promise<ActionResult> {
  const result = await runAction(async () => {
    const me = await requireUser();
    const r = await addInvites(me, eventId, addInvitesSchema.parse(formToObject(form)), await ctx(me.id));
    return {
      ok: true,
      message: `Added ${r.added} to the list${r.skipped ? ` (skipped ${r.skipped} without consent)` : ""}.`,
    };
  });
  if (result.ok) revalidatePath(`/events/${eventId}`);
  return result;
}

export async function updateInviteAction(inviteId: string, patch: InviteUpdate): Promise<ActionResult> {
  const result = await runAction(async () => {
    const me = await requireUser();
    await updateInvite(me, inviteId, inviteUpdateSchema.parse(patch), await ctx(me.id));
    return { ok: true };
  });
  revalidatePath("/", "layout");
  return result;
}

export async function removeInviteAction(inviteId: string): Promise<ActionResult> {
  const result = await runAction(async () => {
    const me = await requireUser();
    await removeInvite(me, inviteId, await ctx(me.id));
    return { ok: true };
  });
  revalidatePath("/", "layout");
  return result;
}
