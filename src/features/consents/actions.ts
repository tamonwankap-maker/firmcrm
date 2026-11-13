"use server";

import { revalidatePath } from "next/cache";
import { requestIp, requireUser } from "@/server/auth/current-user";
import { formToObject, runAction, type ActionResult } from "@/server/actions/result";
import { consentInputSchema } from "./schema";
import { saveConsent } from "./service";

export async function saveConsentAction(_prev: ActionResult | null, form: FormData): Promise<ActionResult> {
  const result = await runAction(async () => {
    const me = await requireUser();
    const input = consentInputSchema.parse(formToObject(form));
    await saveConsent(me, input, { userId: me.id, ip: await requestIp() });
    revalidatePath(`/contacts/${input.contactId}`);
    return { ok: true, message: "Consent saved." };
  });
  return result;
}
