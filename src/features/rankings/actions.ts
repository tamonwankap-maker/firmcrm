"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requestIp, requireUser } from "@/server/auth/current-user";
import { formToObject, runAction, type ActionResult } from "@/server/actions/result";
import { todayInBangkok } from "@/lib/dates";
import { refereeInputSchema, submissionInputSchema } from "./schema";
import {
  addReferee,
  createSubmission,
  removeReferee,
  setRefereeBriefed,
  setSubmissionArchived,
  updateSubmission,
} from "./service";

const ctx = async (userId: string) => ({ userId, ip: await requestIp() });

export async function createSubmissionAction(_prev: ActionResult | null, form: FormData): Promise<ActionResult> {
  let id: string | undefined;
  const result = await runAction(async () => {
    const me = await requireUser();
    id = (await createSubmission(me, submissionInputSchema.parse(formToObject(form)), await ctx(me.id))).id;
    return { ok: true };
  });
  if (result.ok && id) {
    revalidatePath("/", "layout");
    redirect(`/rankings/submissions/${id}`);
  }
  return result;
}

export async function updateSubmissionAction(
  id: string,
  _prev: ActionResult | null,
  form: FormData,
): Promise<ActionResult> {
  const result = await runAction(async () => {
    const me = await requireUser();
    await updateSubmission(me, id, submissionInputSchema.parse(formToObject(form)), await ctx(me.id));
    return { ok: true, message: "Submission saved." };
  });
  if (result.ok) revalidatePath("/", "layout");
  return result;
}

export async function setSubmissionArchivedAction(id: string, archived: boolean): Promise<ActionResult> {
  const result = await runAction(async () => {
    const me = await requireUser();
    await setSubmissionArchived(me, id, archived, await ctx(me.id));
    return { ok: true, message: archived ? "Submission archived." : "Submission restored." };
  });
  revalidatePath("/", "layout");
  return result;
}

export async function addRefereeAction(
  submissionId: string,
  _prev: ActionResult | null,
  form: FormData,
): Promise<ActionResult> {
  const result = await runAction(async () => {
    const me = await requireUser();
    await addReferee(me, submissionId, refereeInputSchema.parse(formToObject(form)), await ctx(me.id));
    return { ok: true, message: "Referee added." };
  });
  if (result.ok) revalidatePath(`/rankings/submissions/${submissionId}`);
  return result;
}

export async function setRefereeBriefedAction(refereeId: string, briefed: boolean): Promise<ActionResult> {
  const result = await runAction(async () => {
    const me = await requireUser();
    await setRefereeBriefed(me, refereeId, briefed, todayInBangkok(), await ctx(me.id));
    return { ok: true };
  });
  revalidatePath("/rankings", "layout");
  return result;
}

export async function removeRefereeAction(refereeId: string): Promise<ActionResult> {
  const result = await runAction(async () => {
    const me = await requireUser();
    await removeReferee(me, refereeId, await ctx(me.id));
    return { ok: true, message: "Referee removed." };
  });
  revalidatePath("/rankings", "layout");
  return result;
}
