import { describe, expect, it } from "vitest";
import { planContacts, planOrganisations } from "@/features/import/plan";
import { orgNameKey } from "@/features/organisations/dedupe";

const orgCtx = {
  industriesByName: new Map([["energy & utilities", "ind-energy"]]),
  usersByEmail: new Map([["partner@firm.com", "u-partner"]]),
  existingKeys: new Set([orgNameKey("Existing Co., Ltd.")]),
  existingThKeys: new Set<string>(),
};

describe("planOrganisations", () => {
  const headers = ["Name (EN)", "Name (TH)", "Type", "Industry", "Country", "Relationship partner email", "Key client"];
  it("creates valid rows, maps labels, and resolves lookups", () => {
    const plan = planOrganisations(
      headers,
      [["PTT Example PCL", "บริษัท ปตท ตัวอย่าง", "Client", "Energy & Utilities", "Thailand", "partner@firm.com", "yes"]],
      orgCtx,
    );
    expect(plan.errors).toEqual([]);
    expect(plan.creates).toHaveLength(1);
    expect(plan.creates[0].input).toMatchObject({
      nameEn: "PTT Example PCL",
      type: "CLIENT",
      industryId: "ind-energy",
      country: "TH",
      relationshipPartnerId: "u-partner",
      isKeyClient: true,
    });
  });
  it("flags duplicates against the CRM and within the file", () => {
    const plan = planOrganisations(
      headers,
      [
        ["EXISTING CO LTD", "", "Prospect", "", "", "", ""],
        ["New One", "", "Prospect", "", "", "", ""],
        ["New One Co., Ltd.", "", "Prospect", "", "", "", ""],
      ],
      orgCtx,
    );
    expect(plan.creates.map((c) => c.row)).toEqual([3]);
    expect(plan.duplicates).toEqual([
      { row: 2, label: "EXISTING CO LTD", message: "Already in the CRM" },
      { row: 4, label: "New One Co., Ltd.", message: "Repeated in this file" },
    ]);
  });
  it("reports row errors with the spreadsheet row number", () => {
    const plan = planOrganisations(
      headers,
      [
        ["A", "", "Alien", "", "", "", ""],
        ["B", "", "Client", "Space mining", "", "", ""],
        ["C", "", "Client", "", "Atlantis", "", ""],
        ["D", "", "Client", "", "", "nobody@firm.com", ""],
      ],
      orgCtx,
    );
    expect(plan.creates).toHaveLength(0);
    expect(plan.errors.map((e) => [e.row, e.message.split(" ")[0]])).toEqual([
      [2, "Unknown"],
      [3, "Unknown"],
      [4, "Unknown"],
      [5, "No"],
    ]);
  });
  it("stops when required columns are missing", () => {
    const plan = planOrganisations(["Name (EN)"], [["X"]], orgCtx);
    expect(plan.missingHeaders).toEqual(["Type"]);
    expect(plan.creates).toHaveLength(0);
  });
});

describe("planContacts", () => {
  const ctx = {
    orgIdsByKey: new Map([[orgNameKey("Siam Example Co., Ltd."), "org-1"]]),
    usersByEmail: new Map([["partner@firm.com", "u-partner"]]),
    existingEmails: new Set(["taken@example.com"]),
    existingNameOrg: new Set<string>(),
    actorId: "u-me",
    todayYmd: "2026-11-13",
    createMissingOrganisations: true,
  };
  const headers = [
    "Name (EN)",
    "Name (TH)",
    "Organisation",
    "Email",
    "Owner emails",
    "Tags",
    "Newsletter consent",
    "Consent date",
  ];

  it("links existing organisations, defaults owner to the importer, records consent", () => {
    const plan = planContacts(
      headers,
      [["Somchai Jaidee", "สมชาย ใจดี", "SIAM EXAMPLE CO LTD", "s@example.com", "", "GC, Energy", "Yes", "2026-01-15"]],
      ctx,
    );
    expect(plan.errors).toEqual([]);
    const c = plan.creates[0];
    expect(c.input.organisationId).toBe("org-1");
    expect(c.input.ownerIds).toEqual(["u-me"]);
    expect(c.input.tags).toEqual(["GC", "Energy"]);
    expect(c.consents).toEqual(["NEWSLETTER"]);
    expect(c.consentDate.toISOString()).toBe("2026-01-15T00:00:00.000Z");
    expect(plan.consentRows).toBe(1);
  });
  it("plans new organisations once, even when several contacts share them", () => {
    const plan = planContacts(
      headers,
      [
        ["A Person", "", "Brand New Ltd", "", "", "", "", ""],
        ["B Person", "", "BRAND NEW CO., LTD.", "", "", "", "", ""],
      ],
      ctx,
    );
    expect(plan.newOrganisations).toEqual(["Brand New Ltd"]);
    expect(plan.creates.every((c) => c.newOrganisationName === "Brand New Ltd")).toBe(true);
  });
  it("rejects unknown organisations when creation is off", () => {
    const plan = planContacts(headers, [["A", "", "Nowhere Inc", "", "", "", "", ""]], {
      ...ctx,
      createMissingOrganisations: false,
    });
    expect(plan.errors[0].message).toMatch(/not found/);
  });
  it("skips duplicate emails (CRM and file) and same name at same organisation", () => {
    const plan = planContacts(
      headers,
      [
        ["X", "", "", "TAKEN@example.com", "", "", "", ""],
        ["Y", "", "", "y@example.com", "", "", "", ""],
        ["Y Again", "", "", "y@example.com", "", "", "", ""],
        ["Khun Somchai", "", "Siam Example Co., Ltd.", "", "", "", "", ""],
        ["Somchai", "", "Siam Example", "", "", "", "", ""],
      ],
      ctx,
    );
    expect(plan.creates.map((c) => c.row)).toEqual([3, 5]);
    expect(plan.duplicates.map((d) => [d.row, d.message])).toEqual([
      [2, "Already in the CRM"],
      [4, "Repeated in this file"],
      [6, "Repeated in this file"],
    ]);
  });
  it("validates owners, emails and dates", () => {
    const plan = planContacts(
      headers,
      [
        ["A", "", "", "", "ghost@firm.com", "", "", ""],
        ["B", "", "", "not-an-email", "", "", "", ""],
        ["C", "", "", "", "", "", "Yes", "15/01/2026"],
      ],
      ctx,
    );
    expect(plan.errors.map((e) => e.row)).toEqual([2, 3, 4]);
  });
});
