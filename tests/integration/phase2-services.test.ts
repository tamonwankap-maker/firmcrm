import { afterAll, beforeEach, describe, expect, it } from "vitest";
import ExcelJS from "exceljs";
import { createOrganisation, findOrganisationDuplicates, updateOrganisation } from "@/features/organisations/service";
import { organisationInputSchema } from "@/features/organisations/schema";
import { createContact } from "@/features/contacts/service";
import { contactInputSchema } from "@/features/contacts/schema";
import { saveConsent } from "@/features/consents/service";
import { consentInputSchema } from "@/features/consents/schema";
import { createActivity, setNextActionDone } from "@/features/activities/service";
import { activityInputSchema } from "@/features/activities/schema";
import { myNextActions } from "@/features/activities/queries";
import { buildPlan, commitPlan } from "@/features/import/service";
import { readSheet } from "@/features/import/read-file";
import { DuplicateError, UserFacingError } from "@/server/actions/result";
import { ForbiddenError, type Actor } from "@/server/auth/policy";
import { db, makeUser, resetDb } from "./helpers";

let bd: Actor, partner: Actor, otherPartner: Actor, viewer: Actor;
const ctx = (a: Actor) => ({ userId: a.id, ip: "127.0.0.1" });
const org = (v: Record<string, unknown>) => organisationInputSchema.parse({ type: "CLIENT", ...v });

beforeEach(async () => {
  await resetDb();
  [bd, partner, otherPartner, viewer] = await Promise.all([
    makeUser("BD"),
    makeUser("PARTNER"),
    makeUser("PARTNER"),
    makeUser("VIEWER"),
  ]);
  await db.industry.create({ data: { name: "Energy & Utilities" } });
});
afterAll(() => db.$disconnect());

describe("organisations", () => {
  it("creates with an audit entry and detects duplicates (legal-form and trigram)", async () => {
    const o = await createOrganisation(
      bd,
      org({ nameEn: "Siam Cement Public Company Limited", nameTh: "บริษัท ปูนซิเมนต์ไทย จำกัด (มหาชน)" }),
      ctx(bd),
    );
    const audit = await db.auditLog.findFirst({ where: { entity: "Organisation", entityId: o.id } });
    expect(audit?.action).toBe("CREATE");
    expect(JSON.stringify(audit?.diff)).toContain("ปูนซิเมนต์ไทย");

    await expect(createOrganisation(bd, org({ nameEn: "SIAM CEMENT PCL" }), ctx(bd))).rejects.toBeInstanceOf(
      DuplicateError,
    );
    await expect(
      createOrganisation(bd, org({ nameEn: "Other", nameTh: "บมจ. ปูนซิเมนต์ไทย" }), ctx(bd)),
    ).rejects.toBeInstanceOf(DuplicateError);
    // close spelling → trigram
    expect(await findOrganisationDuplicates("Siam Cemment Group", null)).toHaveLength(1);
    // confirmed duplicates are allowed
    await expect(
      createOrganisation(bd, org({ nameEn: "Siam Cement PCL", confirmDuplicate: "on" }), ctx(bd)),
    ).resolves.toBeTruthy();
  });

  it("partners edit only organisations they are relationship partner for; viewers cannot create", async () => {
    const mine = await createOrganisation(bd, org({ nameEn: "Mine", relationshipPartnerId: partner.id }), ctx(bd));
    await expect(
      updateOrganisation(partner, mine.id, org({ nameEn: "Mine renamed" }), ctx(partner)),
    ).resolves.toBeTruthy();
    await expect(
      updateOrganisation(otherPartner, mine.id, org({ nameEn: "Hijack" }), ctx(otherPartner)),
    ).rejects.toBeInstanceOf(ForbiddenError);
    await expect(createOrganisation(viewer, org({ nameEn: "Nope" }), ctx(viewer))).rejects.toBeInstanceOf(
      ForbiddenError,
    );
  });
});

describe("contacts, tags, consent", () => {
  it("only the BD team may create new tags", async () => {
    await createContact(bd, contactInputSchema.parse({ nameEn: "A", tags: "GC" }), ctx(bd));
    await expect(
      createContact(partner, contactInputSchema.parse({ nameEn: "B", tags: "GC" }), ctx(partner)),
    ).resolves.toBeTruthy();
    await expect(
      createContact(partner, contactInputSchema.parse({ nameEn: "C", tags: "Brand new" }), ctx(partner)),
    ).rejects.toBeInstanceOf(UserFacingError);
  });

  it("detects duplicate contacts by email", async () => {
    await createContact(bd, contactInputSchema.parse({ nameEn: "A", email: "a@x.com" }), ctx(bd));
    await expect(
      createContact(bd, contactInputSchema.parse({ nameEn: "Someone", email: "A@X.COM" }), ctx(bd)),
    ).rejects.toBeInstanceOf(DuplicateError);
  });

  it("records consent history in the audit log and blocks partners", async () => {
    const c = await createContact(bd, contactInputSchema.parse({ nameEn: "Consenting" }), ctx(bd));
    const base = { contactId: c.id, list: "NEWSLETTER", consentDate: "2026-01-10", source: "EMAIL_REPLY" };
    await saveConsent(bd, consentInputSchema.parse({ ...base, status: "IN" }), ctx(bd));
    await saveConsent(bd, consentInputSchema.parse({ ...base, status: "OUT", withdrawnDate: "2026-06-01" }), ctx(bd));
    const row = await db.mailingConsent.findFirstOrThrow({ where: { contactId: c.id } });
    expect(row.optedIn).toBe(false);
    expect(row.withdrawnDate?.toISOString().slice(0, 10)).toBe("2026-06-01");
    expect(await db.auditLog.count({ where: { entity: "MailingConsent" } })).toBe(2);
    await expect(
      saveConsent(partner, consentInputSchema.parse({ ...base, status: "IN" }), ctx(partner)),
    ).rejects.toBeInstanceOf(ForbiddenError);
  });
});

describe("activities", () => {
  it("infers the organisation from the contact and tracks next actions", async () => {
    const o = await createOrganisation(bd, org({ nameEn: "Acme" }), ctx(bd));
    const c = await createContact(bd, contactInputSchema.parse({ nameEn: "GC", organisationId: o.id }), ctx(bd));
    const a = await createActivity(
      partner,
      activityInputSchema.parse({
        type: "LUNCH",
        date: "2026-11-01",
        summary: "Lunch",
        contactIds: c.id,
        nextAction: "Send proposal",
        nextActionDue: "2026-11-05",
      }),
      ctx(partner),
    );
    expect(a.organisationId).toBe(o.id);
    expect(a.internalAttendees.map((u) => u.id)).toEqual([partner.id]);
    expect(await myNextActions(partner)).toHaveLength(1);
    await expect(setNextActionDone(otherPartner, a.id, true, ctx(otherPartner))).rejects.toBeInstanceOf(ForbiddenError);
    await setNextActionDone(partner, a.id, true, ctx(partner));
    expect(await myNextActions(partner)).toHaveLength(0);
  });
});

describe("import", () => {
  async function xlsx(rows: string[][]) {
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet("Contacts");
    rows.forEach((r) => ws.addRow(r));
    return Buffer.from(await wb.xlsx.writeBuffer());
  }

  it("imports contacts from xlsx: links/creates organisations, tags, consent, skips duplicates, audits everything", async () => {
    await createOrganisation(bd, org({ nameEn: "Existing Bank PCL" }), ctx(bd));
    await createContact(bd, contactInputSchema.parse({ nameEn: "Already Here", email: "here@x.com" }), ctx(bd));
    const buf = await xlsx([
      ["Name (EN)", "Name (TH)", "Organisation", "Email", "Tags", "Newsletter consent"],
      ["Malee Suksawat", "มาลี สุขสวัสดิ์", "EXISTING BANK", "malee@bank.example", "Treasury", "Yes"],
      ["Niran Thongdee", "นิรันดร์ ทองดี", "New Logistics Co., Ltd.", "niran@logi.example", "", ""],
      ["Dup Person", "", "", "here@x.com", "", ""],
      ["Bad Email", "", "", "nope", "", ""],
    ]);
    const sheet = await readSheet("contacts.xlsx", buf);
    const plan = await buildPlan(bd, "contacts", sheet, true);
    expect(plan.creates).toHaveLength(2);
    expect(plan.duplicates).toHaveLength(1);
    expect(plan.errors).toHaveLength(1);

    const res = await commitPlan(bd, "contacts", plan, "contacts.xlsx", ctx(bd));
    expect(res).toEqual({ created: 2, organisationsCreated: 1 });

    const malee = await db.contact.findFirstOrThrow({
      where: { email: "malee@bank.example" },
      include: { organisation: true, tags: true, consents: true },
    });
    expect(malee.nameTh).toBe("มาลี สุขสวัสดิ์");
    expect(malee.organisation?.nameEn).toBe("Existing Bank PCL");
    expect(malee.tags.map((t) => t.name)).toEqual(["Treasury"]);
    expect(malee.consents[0]).toMatchObject({ list: "NEWSLETTER", optedIn: true, source: "IMPORT" });
    const logi = await db.organisation.findFirstOrThrow({ where: { nameEn: "New Logistics Co., Ltd." } });
    expect(logi.type).toBe("PROSPECT");
    expect(await db.auditLog.count({ where: { entity: "Import" } })).toBe(1);
    expect(await db.auditLog.count({ where: { entity: "Contact", action: "CREATE" } })).toBe(3); // 1 manual + 2 imported

    // Re-importing the same file creates nothing new
    const again = await buildPlan(bd, "contacts", sheet, true);
    expect(again.creates).toHaveLength(0);
  });

  it("imports organisations from a Windows-874 CSV", async () => {
    const csv = "Name (EN),Name (TH),Type,Industry\nThai Oil Example,ไทยออยล์ตัวอย่าง,Client,Energy & Utilities\n";
    const tis620 = Buffer.from(
      [...csv].map((ch) => {
        const cp = ch.codePointAt(0)!;
        return cp >= 0x0e01 && cp <= 0x0e5b ? cp - 0x0e01 + 0xa1 : cp;
      }),
    );
    const sheet = await readSheet("orgs.csv", tis620);
    const plan = await buildPlan(bd, "organisations", sheet, false);
    expect(plan.errors).toEqual([]);
    await commitPlan(bd, "organisations", plan, "orgs.csv", ctx(bd));
    const o = await db.organisation.findFirstOrThrow({
      where: { nameEn: "Thai Oil Example" },
      include: { industry: true },
    });
    expect(o.nameTh).toBe("ไทยออยล์ตัวอย่าง");
    expect(o.industry?.name).toBe("Energy & Utilities");
  });
});
