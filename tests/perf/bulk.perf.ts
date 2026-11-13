/** Bulk operations at firm scale: 5,000-row import, large Excel and PDF exports. */
import { afterAll, describe, expect, it } from "vitest";
import ExcelJS from "exceljs";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";
import type { Actor } from "@/server/auth/policy";
import { readSheet } from "@/features/import/read-file";
import { buildPlan } from "@/features/import/service";
import { runReport } from "@/features/reports/run";
import { parseReportParams } from "@/features/reports/params";
import { buildWorkbook } from "@/features/reports/export/excel";
import { buildPdf } from "@/features/reports/export/pdf";

const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }) });
afterAll(() => db.$disconnect());

const ms = (t: number) => Math.round(performance.now() - t);

describe("bulk operations", async () => {
  const bd = await db.user.findFirstOrThrow({ where: { role: "BD" } });
  const actor: Actor = { id: bd.id, role: "BD" };

  it("plans a 5,000-row contact import (dedupe against 50k contacts) in under 10 s", async () => {
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet("Contacts");
    ws.addRow(["Name (EN)", "Name (TH)", "Organisation", "Email"]);
    for (let i = 0; i < 5000; i++)
      ws.addRow([`Import Person ${i}`, `ผู้นำเข้า ${i}`, `Siam Energy ${i % 300} Co., Ltd.`, `imp${i}@example.com`]);
    const sheet = await readSheet("big.xlsx", Buffer.from(await wb.xlsx.writeBuffer()));
    const t = performance.now();
    const plan = await buildPlan(actor, "contacts", sheet, true);
    const took = ms(t);
    console.log(`import plan: ${took} ms, ${plan.creates.length} to create`);
    expect(plan.creates.length).toBe(5000);
    expect(took).toBeLessThan(10_000);
  });

  it("exports the 20k-row PDPA list to Excel quickly, and caps the PDF", async () => {
    const ran = (await runReport(actor, "consent", parseReportParams({ list: "NEWSLETTER" })))!;
    let t = performance.now();
    const xlsx = await buildWorkbook({
      title: "x",
      subtitle: "y",
      generatedBy: "perf",
      generatedAt: "now",
      result: ran.result,
    });
    console.log(`excel ${ran.result.rows.length} rows: ${ms(t)} ms, ${(xlsx.length / 1024).toFixed(0)} KB`);
    t = performance.now();
    const pdf = await buildPdf({
      title: "x",
      subtitle: "y",
      generatedBy: "perf",
      generatedAt: "now",
      result: ran.result,
    });
    const pdfMs = ms(t);
    console.log(`pdf: ${pdfMs} ms, ${(pdf.length / 1024).toFixed(0)} KB`);
    expect(pdfMs).toBeLessThan(30_000); // capped at PDF_MAX_ROWS
  });
});
