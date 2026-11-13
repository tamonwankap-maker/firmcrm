import { z } from "zod";
import { normalizeText } from "@/lib/thai";
import { zCheckbox, zIdList, zOptEmail, zOptId, zOptText, zOptUrl, zText } from "@/lib/zod-helpers";
import { LANGUAGES } from "../labels";

/** "Banking, GC , ลูกค้า VIP" → ["Banking", "GC", "ลูกค้า VIP"] (deduplicated, case-insensitive). */
export function parseTags(raw: unknown): string[] {
  if (typeof raw !== "string") return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const t of raw.split(/[,;]/)) {
    const v = normalizeText(t);
    if (v && v.length <= 50 && !seen.has(v.toLowerCase())) {
      seen.add(v.toLowerCase());
      out.push(v);
    }
  }
  return out.slice(0, 20);
}

export const contactInputSchema = z.object({
  nameEn: zText(200, "English name is required"),
  nameTh: zOptText(200),
  title: zOptText(200),
  organisationId: zOptId,
  email: zOptEmail,
  phone: zOptText(50),
  linkedinUrl: zOptUrl,
  ownerIds: zIdList(10),
  relationshipStrength: z.coerce.number().int().min(1).max(5).default(3),
  preferredLanguage: z.enum(LANGUAGES).default("EN"),
  tags: z.preprocess(parseTags, z.array(z.string())),
  notes: zOptText(10_000),
  confirmDuplicate: zCheckbox.optional(),
});

export type ContactInput = z.infer<typeof contactInputSchema>;
