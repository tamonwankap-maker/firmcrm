import "server-only";
import { db } from "@/server/db";
import { DEFAULT_SETTINGS, settingsSchema, type Settings } from "./schema";

/** Current settings, falling back to defaults for anything missing or invalid. */
export async function getSettings(): Promise<Settings> {
  const rows = await db.setting.findMany();
  const stored = Object.fromEntries(rows.map((r) => [r.key, r.value]));
  const merged = {
    ...DEFAULT_SETTINGS,
    ...stored,
    stageDefaultProbability: {
      ...DEFAULT_SETTINGS.stageDefaultProbability,
      ...((stored.stageDefaultProbability as object | undefined) ?? {}),
    },
  };
  const parsed = settingsSchema.safeParse(merged);
  return parsed.success ? parsed.data : DEFAULT_SETTINGS;
}
