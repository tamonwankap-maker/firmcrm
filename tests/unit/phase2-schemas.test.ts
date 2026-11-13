import { describe, expect, it } from "vitest";
import { activityInputSchema } from "@/features/activities/schema";
import { consentInputSchema } from "@/features/consents/schema";
import { contactInputSchema, parseTags } from "@/features/contacts/schema";
import { organisationInputSchema } from "@/features/organisations/schema";
import { searchTerms } from "@/server/text-search";

describe("organisation schema", () => {
  it("normalises Thai, defaults country, adds https to websites", () => {
    const v = organisationInputSchema.parse({
      nameEn: "  Acme ",
      nameTh: "บริษัท​ เอ",
      type: "CLIENT",
      website: "acme.co.th",
    });
    expect(v).toMatchObject({
      nameEn: "Acme",
      nameTh: "บริษัท เอ",
      country: "TH",
      website: "https://acme.co.th",
      isKeyClient: false,
    });
  });
  it("rejects unknown country codes", () => {
    expect(organisationInputSchema.safeParse({ nameEn: "A", type: "CLIENT", country: "XX" }).success).toBe(false);
  });
});

describe("contact schema", () => {
  it("parses tags, lower-cases email, bounds strength", () => {
    const v = contactInputSchema.parse({
      nameEn: "A",
      email: " A@B.COM ",
      tags: "GC, gc ; Japan desk",
      relationshipStrength: "5",
    });
    expect(v.email).toBe("a@b.com");
    expect(v.tags).toEqual(["GC", "Japan desk"]);
    expect(contactInputSchema.safeParse({ nameEn: "A", relationshipStrength: "6" }).success).toBe(false);
  });
  it("parseTags ignores blanks and over-long tags", () => {
    expect(parseTags(` , ${"x".repeat(51)}, ok`)).toEqual(["ok"]);
  });
});

describe("activity schema", () => {
  const base = { type: "MEETING", date: "2026-11-13", summary: "Met GC", organisationId: "org" };
  it("accepts a minimal activity", () => {
    expect(activityInputSchema.safeParse(base).success).toBe(true);
  });
  it("requires a contact or organisation", () => {
    expect(activityInputSchema.safeParse({ ...base, organisationId: "" }).success).toBe(false);
  });
  it("needs a next action text when a due date is set", () => {
    const r = activityInputSchema.safeParse({ ...base, nextActionDue: "2026-11-20" });
    expect(r.success).toBe(false);
  });
  it("gift value only on gifts", () => {
    expect(activityInputSchema.safeParse({ ...base, giftValue: "1500" }).success).toBe(false);
    expect(activityInputSchema.safeParse({ ...base, type: "GIFT", giftValue: "1,500" }).success).toBe(true);
  });
});

describe("consent schema", () => {
  it("rejects a withdrawal before the consent date", () => {
    const r = consentInputSchema.safeParse({
      contactId: "c",
      list: "NEWSLETTER",
      status: "OUT",
      consentDate: "2026-05-01",
      withdrawnDate: "2026-04-01",
      source: "EMAIL_REPLY",
    });
    expect(r.success).toBe(false);
  });
});

describe("searchTerms", () => {
  it("splits English words; keeps unspaced Thai as one term", () => {
    expect(searchTerms(" siam   cement ")).toEqual(["siam", "cement"]);
    expect(searchTerms("ปูนซิเมนต์ไทย")).toEqual(["ปูนซิเมนต์ไทย"]);
    expect(searchTerms("")).toEqual([]);
  });
});
