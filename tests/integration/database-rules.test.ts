import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { db, makeOrg, makeUser, resetDb } from "./helpers";

let orgId: string;
let userId: string;

beforeAll(async () => {
  await resetDb();
  orgId = (await makeOrg()).id;
  userId = (await makeUser("PARTNER")).id;
});
afterAll(() => db.$disconnect());

const opp = (data: Record<string, unknown>) =>
  db.opportunity.create({
    data: { name: "Deal", organisationId: orgId, source: "INBOUND", leadPartnerId: userId, ...data },
  });

describe("database check constraints", () => {
  it("Won/Lost requires outcome reason and closed date", async () => {
    await expect(opp({ stage: "WON" })).rejects.toThrow();
    await expect(opp({ stage: "LOST", outcomeReason: "PRICE" })).rejects.toThrow();
    await expect(
      opp({ stage: "LOST", outcomeReason: "PRICE", closedDate: new Date("2026-11-01") }),
    ).resolves.toBeTruthy();
  });
  it("cannot win with a conflict", async () => {
    await expect(
      opp({ stage: "WON", outcomeReason: "RELATIONSHIP", closedDate: new Date(), conflictStatus: "CONFLICT" }),
    ).rejects.toThrow();
  });
  it("fee min must not exceed max; probability 0–100", async () => {
    await expect(opp({ feeEstimateMin: 200, feeEstimateMax: 100 })).rejects.toThrow();
    await expect(opp({ probability: 101 })).rejects.toThrow();
  });
  it("relationship strength and health score are 1–5", async () => {
    await expect(db.contact.create({ data: { nameEn: "X", relationshipStrength: 6 } })).rejects.toThrow();
    await expect(
      db.clientPlan.create({ data: { organisationId: orgId, year: 2026, objectives: "x", healthScore: 0 } }),
    ).rejects.toThrow();
  });
  it("a task links to at most one record", async () => {
    const contact = await db.contact.create({ data: { nameEn: "Y" } });
    await expect(
      db.task.create({ data: { title: "t", ownerId: userId, organisationId: orgId, contactId: contact.id } }),
    ).rejects.toThrow();
    await expect(
      db.task.create({ data: { title: "t", ownerId: userId, organisationId: orgId } }),
    ).resolves.toBeTruthy();
  });
  it("country must be an ISO-2 code", async () => {
    await expect(db.organisation.create({ data: { nameEn: "Z", type: "CLIENT", country: "th" } })).rejects.toThrow();
  });
});

describe("audit log is append-only", () => {
  it("rejects UPDATE and DELETE", async () => {
    const row = await db.auditLog.create({ data: { action: "CREATE", entity: "Test", entityId: "1" } });
    await expect(db.auditLog.update({ where: { id: row.id }, data: { entity: "Hacked" } })).rejects.toThrow(
      /append-only/,
    );
    await expect(db.auditLog.delete({ where: { id: row.id } })).rejects.toThrow(/append-only/);
  });
});
