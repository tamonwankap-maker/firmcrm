import { describe, expect, it } from "vitest";
import { consentWarning, contactsWithoutInviteConsent, costPerAttendee, inviteStats } from "@/features/events/rules";
import { eventInputSchema } from "@/features/events/schema";
import { contentInputSchema } from "@/features/content/schema";
import { crossSellGaps, distinctPractices } from "@/features/client-plans/rules";

describe("event invite consent", () => {
  const c = (id: string, consents: { list: string; optedIn: boolean }[]) => ({ id, nameEn: id, consents });
  it("flags contacts without an active EVENT_INVITES opt-in", () => {
    const res = contactsWithoutInviteConsent([
      c("ok", [{ list: "EVENT_INVITES", optedIn: true }]),
      c("withdrawn", [{ list: "EVENT_INVITES", optedIn: false }]),
      c("other-list-only", [{ list: "NEWSLETTER", optedIn: true }]),
      c("none", []),
    ]);
    expect(res.map((x) => x.id)).toEqual(["withdrawn", "other-list-only", "none"]);
  });
  it("summarises names in the warning", () => {
    expect(consentWarning(["A"])).toMatch(/^This contact has no event-invitation consent \(PDPA\): A\./);
    expect(consentWarning(Array.from({ length: 10 }, (_, i) => `P${i}`))).toMatch(/10 contacts have .* and 2 more/);
  });
});

describe("invite stats and cost", () => {
  it("counts RSVPs, attendance and open follow-ups", () => {
    const s = inviteStats([
      { invited: true, rsvp: "YES", attended: true, followUpOwnerId: "u", followUpDone: false },
      { invited: true, rsvp: "YES", attended: true, followUpOwnerId: null, followUpDone: false },
      { invited: true, rsvp: "NO_REPLY", attended: null, followUpOwnerId: null, followUpDone: false },
      { invited: false, rsvp: "NO_REPLY", attended: null, followUpOwnerId: null, followUpDone: false },
      { invited: true, rsvp: "NO", attended: false, followUpOwnerId: null, followUpDone: false },
    ]);
    expect(s).toEqual({
      listed: 5,
      invited: 4,
      yes: 2,
      no: 1,
      maybe: 0,
      noReply: 1,
      attended: 2,
      followUpsOpen: 2,
      followUpsUnassigned: 1,
    });
  });
  it("cost per attendee", () => {
    expect(costPerAttendee(96_500, 2)).toBe(48_250);
    expect(costPerAttendee(null, 2)).toBeNull();
    expect(costPerAttendee(1000, 0)).toBeNull();
  });
});

describe("event schema", () => {
  const base = { title: "Seminar", startsAt: "2026-12-04T08:30", venue: "Hotel" };
  it("parses Bangkok times and requires venue / link by format", () => {
    expect(eventInputSchema.parse(base).startsAt.toISOString()).toBe("2026-12-04T01:30:00.000Z");
    expect(eventInputSchema.safeParse({ ...base, venue: "" }).success).toBe(false);
    expect(eventInputSchema.safeParse({ ...base, format: "ONLINE", venue: "" }).success).toBe(false);
    expect(
      eventInputSchema.safeParse({ ...base, format: "ONLINE", venue: "", onlineUrl: "teams.microsoft.com/x" }).success,
    ).toBe(true);
  });
  it("end must be after start", () => {
    expect(eventInputSchema.safeParse({ ...base, endsAt: "2026-12-04T07:00" }).success).toBe(false);
  });
});

describe("content schema", () => {
  it("published needs a date; at least one author", () => {
    expect(
      contentInputSchema.safeParse({ title: "x", type: "ARTICLE", status: "PUBLISHED", authorIds: "u" }).success,
    ).toBe(false);
    expect(contentInputSchema.safeParse({ title: "x", type: "ARTICLE", authorIds: "" }).success).toBe(false);
    expect(
      contentInputSchema.safeParse({
        title: "x",
        type: "ARTICLE",
        status: "PUBLISHED",
        publishDate: "2026-11-01",
        authorIds: "u",
      }).success,
    ).toBe(true);
  });
});

describe("cross-sell analysis", () => {
  const tax = { id: "tax", name: "Tax" };
  const emp = { id: "emp", name: "Employment" };
  const cm = { id: "cm", name: "Capital Markets" };
  it("classifies each target as won, in pipeline or gap", () => {
    expect(crossSellGaps({ targets: [tax, emp, cm], usedWon: [emp], openPipeline: [cm] }).map((g) => g.status)).toEqual(
      ["gap", "won", "in_pipeline"],
    );
  });
  it("distinct practices", () => {
    expect(distinctPractices([{ practiceAreas: [tax, cm] }, { practiceAreas: [cm] }]).map((p) => p.id)).toEqual([
      "cm",
      "tax",
    ]);
  });
});
