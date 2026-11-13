/**
 * Times the queries behind the main screens on a database with ~10k organisations, 50k contacts,
 * 30k activities, 3k opportunities. Budget: median under 400 ms per query (page budget ~1 s).
 * Run: npm run perf
 */
import { afterAll, describe, expect, it } from "vitest";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";
import type { Actor } from "@/server/auth/policy";
import { listOrganisations, orgFilterSchema } from "@/features/organisations/queries";
import { contactFilterSchema, listContacts } from "@/features/contacts/queries";
import { activityFilterSchema, listActivities, myNextActions } from "@/features/activities/queries";
import {
  listOpportunities,
  oppFilterSchema,
  pipelineSummary,
  boardOpportunities,
} from "@/features/opportunities/queries";
import { globalSearch } from "@/features/search/queries";
import { dashboardStats, recentActivities } from "@/features/dashboard/queries";
import { myOpenTasks } from "@/features/tasks/queries";
import { runReport } from "@/features/reports/run";
import { parseReportParams } from "@/features/reports/params";
import { findOrganisationDuplicates } from "@/features/organisations/service";

const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }) });
afterAll(() => db.$disconnect());

const BUDGET_MS = 400;
const results: { name: string; ms: number }[] = [];

async function time(name: string, fn: () => Promise<unknown>) {
  await fn(); // warm-up
  const runs: number[] = [];
  for (let i = 0; i < 3; i++) {
    const t = performance.now();
    await fn();
    runs.push(performance.now() - t);
  }
  const ms = Math.round(runs.sort((a, b) => a - b)[1]);
  results.push({ name, ms });
  return ms;
}

describe("query performance at firm scale", async () => {
  const bd = await db.user.findFirstOrThrow({ where: { role: "BD" } });
  const partner = await db.user.findFirstOrThrow({ where: { role: "PARTNER" } });
  const actorBd: Actor = { id: bd.id, role: "BD" };
  const actorPartner: Actor = { id: partner.id, role: "PARTNER" };
  const params = parseReportParams({ from: "2025-01-01", to: "2026-12-31" });

  const cases: [string, () => Promise<unknown>][] = [
    ["organisations list (page 1)", () => listOrganisations(actorBd, orgFilterSchema.parse({}))],
    ["organisations search Thai 'พลังงาน'", () => listOrganisations(actorBd, orgFilterSchema.parse({ q: "พลังงาน" }))],
    [
      "organisations search English 'energy hold'",
      () => listOrganisations(actorBd, orgFilterSchema.parse({ q: "energy hold" })),
    ],
    ["contacts list (page 40)", () => listContacts(actorBd, contactFilterSchema.parse({ page: "40" }))],
    ["contacts search email fragment", () => listContacts(actorBd, contactFilterSchema.parse({ q: "p4321@" }))],
    [
      "contacts opted in to newsletter",
      () => listContacts(actorBd, contactFilterSchema.parse({ consent: "NEWSLETTER" })),
    ],
    [
      "activities list (partner, confidential filter)",
      () => listActivities(actorPartner, activityFilterSchema.parse({})),
    ],
    ["my next actions", () => myNextActions(actorBd)],
    ["opportunities table (partner)", () => listOpportunities(actorPartner, oppFilterSchema.parse({}))],
    ["opportunities board", () => boardOpportunities(actorBd, oppFilterSchema.parse({}))],
    ["pipeline summary (all opps)", () => pipelineSummary(35)],
    ["global search Thai", () => globalSearch(actorBd, "กรุงเทพ")],
    ["dashboard stats", () => dashboardStats(actorBd)],
    ["dashboard recent activity", () => recentActivities(actorBd)],
    ["my open tasks", () => myOpenTasks(actorBd)],
    [
      "duplicate check (trigram)",
      () => findOrganisationDuplicates("Siam Energy 4242 Co Ltd", "บริษัท สยามพลังงาน 4242 จำกัด"),
    ],
    ["report: open pipeline", () => runReport(actorBd, "pipeline", params)],
    ["report: activity by person", () => runReport(actorBd, "activity", params)],
    ["report: PDPA mailing list (20k rows)", () => runReport(actorBd, "consent", params)],
  ];

  for (const [name, fn] of cases) {
    it(name, async () => {
      const ms = await time(name, fn);
      expect(ms, `${name} took ${ms} ms`).toBeLessThan(BUDGET_MS);
    });
  }

  it("prints a summary", () => {
    console.table(results);
  });
});
