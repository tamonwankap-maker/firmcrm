"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requestIp, requireUser } from "@/server/auth/current-user";
import { formToObject, runAction, type ActionResult } from "@/server/actions/result";
import { TASK_STATUSES } from "../labels";
import { taskInputSchema } from "./schema";
import { createTask, setTaskStatus, updateTask } from "./service";

export async function createTaskAction(_prev: ActionResult | null, form: FormData): Promise<ActionResult> {
  const result = await runAction(async () => {
    const me = await requireUser();
    await createTask(me, taskInputSchema.parse(formToObject(form)), { userId: me.id, ip: await requestIp() });
    return { ok: true, message: "Task added." };
  });
  if (result.ok) revalidatePath("/", "layout");
  return result;
}

export async function updateTaskAction(id: string, _prev: ActionResult | null, form: FormData): Promise<ActionResult> {
  const result = await runAction(async () => {
    const me = await requireUser();
    await updateTask(me, id, taskInputSchema.parse(formToObject(form)), { userId: me.id, ip: await requestIp() });
    return { ok: true, message: "Task saved." };
  });
  if (result.ok) revalidatePath("/", "layout");
  return result;
}

export async function setTaskStatusAction(id: string, status: string): Promise<ActionResult> {
  const result = await runAction(async () => {
    const me = await requireUser();
    await setTaskStatus(me, id, z.enum(TASK_STATUSES).parse(status), { userId: me.id, ip: await requestIp() });
    return { ok: true };
  });
  revalidatePath("/", "layout");
  return result;
}
