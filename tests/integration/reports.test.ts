import { afterAll, beforeAll, describe, expect, it } from "vitest";
import ExcelJS from "exceljs";
import { runReport } from "@/features/reports/run";
import { parseReportParams } from "@/features/reports/params";
import { buildWorkbook } from "@/features/reports/export/excel";
import { buildPdf } from "@/features/reports/export/pdf";
import { ForbiddenError, type Actor } from "@/server/auth/policy";
import { db, makeOrg, makeUser, resetDb } from "./helpers";

let admin: Actor, bd: Actor, lead: Actor, otherPartner: Actor, viewer: Actor;
const params = (sp: Record<string, string> = {}) =>
  parseReportParams({ from: "2026-01-01", to: "2026-12-31", ...sp }, new Date("2026-11-13T00:00:00Z"));

beforeAll(async () => {
  await resetDb();
  [admin, bd, lead, otherPartner, viewer] = await Promise.all([
    makeUser("ADMIN"),
    makeUser("BD"),
    makeUser("PARTNER"),
    makeUser("PARTNER"),
    makeUser("VIEWER"),
  ]);
  const org = await makeOrg("ธนาคารทดสอบ Test Bank");
  const pa = await db.practiceArea.create({ data: { name: "Tax" } });
  const base = {
    organisationId: org.id,
    source: "REFERRAL" as const,
    leadPartnerId: lead.id,
    practiceAreas: { connect: [{ id: pa.id }] },
  };
  await db.opportunity.create({
    data: {
      ...base,
      name: "Public deal",
      stage: "SUBMITTED",
      probability: 50,
      feeEstimateMin: 1_000_000,
      feeEstimateMax: 3_000_000,
    },
  });
  await db.opportunity.create({
    data: {
      ...base,
      name: "Secret deal",
      stage: "QUALIFIED",
      probability: 20,
      confidential: true,
      feeEstimateMin: 500_000,
      feeEstimateMax: 500_000,
    },
  });
  await db.opportunity.create({
    data: { ...base, name: "Other partner deal", leadPartnerId: otherPartner.id, stage: "LEAD", probability: 10 },
  });
  await db.opportunity.create({
    data: {
      ...base,
      name: "Won deal",
      stage: "WON",
      probability: 100,
      outcomeReason: "RELATIONSHIP",
      closedDate: new Date("2026-03-01"),
    },
  });
  await db.opportunity.create({
    data: {
      ...base,
      name: "Lost deal",
      stage: "LOST",
      probability: 0,
      outcomeReason: "PRICE",
      closedDate: new Date("2026-04-01"),
    },
  });
  const c1 = await db.contact.create({ data: { nameEn: "Opted In", nameTh: "สมชาย", email: "a@x.com" } });
  const c2 = await db.contact.create({ data: { nameEn: "Withdrawn", email: "b@x.com" } });
  await db.mailingConsent.create({
    data: {
      contactId: c1.id,
      list: "NEWSLETTER",
      optedIn: true,
      consentDate: new Date("2026-01-05"),
      source: "WEB_FORM",
    },
  });
  await db.mailingConsent.create({
    data: {
      contactId: c2.id,
      list: "NEWSLETTER",
      optedIn: false,
      consentDate: new Date("2026-01-05"),
      withdrawnDate: new Date("2026-06-01"),
      source: "WEB_FORM",
    },
  });
});
afterAll(() => db.$disconnect());

const names = (rows: { name?: unknown }[]) => rows.map((r) => r.name).sort();

describe("report access and visibility", () => {
  it("pipeline: admin sees confidential, BD does not, partners see only their own", async () => {
    expect(names((await runReport(admin, "pipeline", params()))!.result.rows)).toEqual([
      "Other partner deal",
      "Public deal",
      "Secret deal",
    ]);
    expect(names((await runReport(bd, "pipeline", params()))!.result.rows)).toEqual([
      "Other partner deal",
      "Public deal",
    ]);
    expect(names((await runReport(lead, "pipeline", params()))!.result.rows)).toEqual(["Public deal", "Secret deal"]);
    expect(names((await runReport(otherPartner, "pipeline", params()))!.result.rows)).toEqual(["Other partner deal"]);
  });

  it("pipeline weighted total uses midpoint × probability", async () => {
    const r = (await runReport(bd, "pipeline", params()))!.result;
    expect(r.rows.find((x) => x.name === "Public deal")?.weighted).toBe(1_000_000);
  });

  it("win/loss counts and win rate", async () => {
    const r = (await runReport(bd, "win-loss", params()))!.result;
    expect(r.rows).toHaveLength(2);
    expect(r.highlights?.find((h) => h.label === "Win rate")?.value).toBe("50%");
    expect(r.chart?.data).toEqual([{ practice: "Tax", won: 1, lost: 1 }]);
  });

  it("consent list includes only active opt-ins; partners and viewers are refused", async () => {
    const r = (await runReport(bd, "consent", params({ list: "NEWSLETTER" })))!.result;
    expect(r.rows.map((x) => x.nameEn)).toEqual(["Opted In"]);
    await expect(runReport(lead, "consent", params())).rejects.toBeInstanceOf(ForbiddenError);
    await expect(runReport(viewer, "pipeline", params())).rejects.toBeInstanceOf(ForbiddenError);
    expect(await runReport(bd, "no-such-report", params())).toBeNull();
  });
});

describe("export files", () => {
  it("Excel has typed numbers, real dates and Thai text", async () => {
    const ran = (await runReport(admin, "pipeline", params()))!;
    const buf = await buildWorkbook({
      title: ran.def.title,
      subtitle: ran.subtitle,
      generatedBy: "Test",
      generatedAt: "now",
      result: ran.result,
    });
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(buf as unknown as ArrayBuffer);
    const ws = wb.worksheets[0];
    expect(ws.getRow(4).getCell(1).value).toBe("Opportunity");
    const weightedCol = ran.result.columns.findIndex((c) => c.key === "weighted") + 1;
    expect(typeof ws.getRow(5).getCell(weightedCol).value).toBe("number");
    expect(ws.getColumn(weightedCol).numFmt).toBe("#,##0");
    const clientCol = ran.result.columns.findIndex((c) => c.key === "client") + 1;
    expect(String(ws.getRow(5).getCell(clientCol).value)).toContain("ธนาคารทดสอบ");
  });

  it("PDF renders with the embedded Thai font", async () => {
    const ran = (await runReport(bd, "consent", params()))!;
    const buf = await buildPdf({
      title: ran.def.title,
      subtitle: ran.subtitle,
      generatedBy: "Test",
      generatedAt: "now",
      result: ran.result,
    });
    expect(buf.subarray(0, 4).toString()).toBe("%PDF");
    expect(buf.toString("latin1")).toMatch(/Sarabun/);
  }, 30_000);
});
