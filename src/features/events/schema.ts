import { z } from "zod";
import { zBangkokDateTime, zIdList, zOptId, zOptMoney, zOptText, zOptUrl, zText } from "@/lib/zod-helpers";
import { parseBangkokDateTime } from "@/lib/dates";
import { CURRENCIES, EVENT_FORMATS, EVENT_STATUSES, RSVPS } from "../labels";

const zOptBangkokDateTime = z.preprocess(
  (v) => (v === "" || v == null ? null : v),
  z
    .string()
    .nullable()
    .transform((v, ctx) => {
      if (v == null) return null;
      const d = parseBangkokDateTime(v);
      if (!d) {
        ctx.addIssue({ code: "custom", message: "Enter a date and time" });
        return z.NEVER;
      }
      return d;
    }),
);

export const eventInputSchema = z
  .object({
    title: zText(300, "Enter a title"),
    startsAt: zBangkokDateTime,
    endsAt: zOptBangkokDateTime,
    format: z.enum(EVENT_FORMATS).default("IN_PERSON"),
    venue: zOptText(300),
    onlineUrl: zOptUrl,
    practiceAreaIds: zIdList(20),
    speakerIds: zIdList(20),
    externalSpeakers: zOptText(1000),
    ownerId: zOptId,
    budget: zOptMoney,
    actualCost: zOptMoney,
    currency: z.enum(CURRENCIES).default("THB"),
    status: z.enum(EVENT_STATUSES).default("PLANNING"),
    notes: zOptText(10_000),
  })
  .superRefine((v, ctx) => {
    if (v.endsAt && v.endsAt < v.startsAt)
      ctx.addIssue({ code: "custom", path: ["endsAt"], message: "End must be after the start" });
    if (v.format !== "ONLINE" && !v.venue)
      ctx.addIssue({ code: "custom", path: ["venue"], message: "Enter the venue" });
    if (v.format !== "IN_PERSON" && !v.onlineUrl)
      ctx.addIssue({ code: "custom", path: ["onlineUrl"], message: "Enter the online link" });
  });
export type EventInput = z.infer<typeof eventInputSchema>;

export const addInvitesSchema = z.object({
  contactIds: zIdList(500),
  tagId: z.preprocess((v) => (v === "" ? undefined : v), z.string().max(40).optional()),
  organisationId: z.preprocess((v) => (v === "" ? undefined : v), z.string().max(40).optional()),
  /** Skip contacts without event-invitation consent instead of warning. */
  onlyConsented: z.preprocess((v) => v === "on", z.boolean()).optional(),
  confirm: z.preprocess((v) => v === "on", z.boolean()).optional(),
});

export const inviteUpdateSchema = z.object({
  invited: z.boolean().optional(),
  rsvp: z.enum(RSVPS).optional(),
  attended: z.boolean().nullable().optional(),
  followUpOwnerId: z.string().max(40).nullable().optional(),
  followUpDone: z.boolean().optional(),
});
export type InviteUpdate = z.infer<typeof inviteUpdateSchema>;
