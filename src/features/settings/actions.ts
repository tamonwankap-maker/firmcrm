"use server";

import { revalidatePath } from "next/cache";
import { requestIp, requireUser } from "@/server/auth/current-user";
import { assertCan } from "@/server/auth/policy";
import { withAudit } from "@/server/audit";
import { runAction, type ActionResult } from "@/server/actions/result";
import { settingsSchema, STAGES } from "./schema";
import { getSettings } from "./queries";

export async function saveSettingsAction(_prev: ActionResult | null, form: FormData): Promise<ActionResult> {
  return runAction(async () => {
    const me = await requireUser();
    assertCan(me, "update", "Setting");
    const input = settingsSchema.parse({
      usdToThbRate: form.get("usdToThbRate"),
      stageDefaultProbability: Object.fromEntries(STAGES.map((s) => [s, form.get(`prob_${s}`)])),
    });
    const before = await getSettings();
    await withAudit({ userId: me.id, ip: await requestIp() }, async (tx) => {
      for (const [key, value] of Object.entries(input)) {
        await tx.setting.upsert({ where: { key }, create: { key, value }, update: { value } });
      }
      return {
        result: null,
        audit: [{ action: "UPDATE", entity: "Setting", entityId: "global", before, after: input }],
      };
    });
    revalidatePath("/admin/settings");
    return { ok: true, message: "Settings saved." };
  });
}
