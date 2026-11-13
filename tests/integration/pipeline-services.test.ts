import { afterAll, beforeEach, describe, expect, it } from "vitest";
import {
  changeStage,
  createOpportunity,
  loadVisibleOpportunity,
  updateOpportunity,
} from "@/features/opportunities/service";
import { opportunityInputSchema, stageChangeSchema } from "@/features/opportunities/schema";
import { pipelineSummary } from "@/features/opportunities/queries";
import { addChecklistItem, createPitch, removeChecklistItem } from "@/features/pitches/service";
import { pitchInputSchema } from "@/features/pitches/schema";
import { createTask } from "@/features/tasks/service";
import { taskInputSchema } from "@/features/tasks/schema";
import { createActivity } from "@/features/activities/service";
import { activityInputSchema } from "@/features/activities/schema";
import { DEFAULT_SETTINGS } from "@/features/settings/schema";
import { ConfirmRequiredError, UserFacingError } from "@/server/actions/result";
import { ForbiddenError, type Actor } from "@/server/auth/policy";
import { db, makeOrg, makeUser, resetDb } from "./helpers";

let admin: Actor, bd: Actor, teamBd: Actor, lead: Actor, otherPartner: Actor, viewer: Actor;
let orgId: string, paId: string;
const ctx = (a: Actor) => ({ userId: a.id });
const S = DEFAULT_SETTINGS;

const input = (v: Record<string, unknown> = {}) =>
  opportunityInputSchema.parse({
    name: "Project Lotus",
    organisationId: orgId,
    source: "REFERRAL",
    leadPartnerId: lead.id,
    practiceAreaIds: paId,
    feeEstimateMin: "1000000",
    feeEstimateMax: "2000000",
    ...v,
  });
const stage = (v: Record<string, unknown>) => stageChangeSchema.parse(v);

beforeEach(async () => {
  await resetDb();
  [admin, bd, teamBd, lead, otherPartner, viewer] = await Promise.all([
    makeUser("ADMIN"),
    makeUser("BD"),
    makeUser("BD"),
    makeUser("PARTNER"),
    makeUser("PARTNER"),
    makeUser("VIEWER"),
  ]);
  orgId = (await makeOrg("Lotus Holdings")).id;
  paId = (await db.practiceArea.create({ data: { name: "Corporate/M&A" } })).id;
});
afterAll(() => db.$disconnect());

describe("creating and editing opportunities", () => {
  it("uses the stage default probability and records the initial stage", async () => {
    const o = await createOpportunity(bd, input({ stage: "QUALIFIED" }), S, ctx(bd));
    expect(o.probability).toBe(S.stageDefaultProbability.QUALIFIED);
    expect(
      await db.opportunityStageChange.count({ where: { opportunityId: o.id, fromStage: null, toStage: "QUALIFIED" } }),
    ).toBe(1);
    expect(await db.auditLog.count({ where: { entity: "Opportunity", entityId: o.id } })).toBe(1);
  });

  it("you cannot make a deal confidential that you would then be unable to see", async () => {
    await expect(createOpportunity(bd, input({ confidential: "on" }), S, ctx(bd))).rejects.toBeInstanceOf(
      UserFacingError,
    );
    await expect(
      createOpportunity(bd, input({ confidential: "on", teamIds: bd.id }), S, ctx(bd)),
    ).resolves.toBeTruthy();
    await expect(createOpportunity(admin, input({ confidential: "on" }), S, ctx(admin))).resolves.toBeTruthy();
  });

  it("partners edit only deals they lead or are on; viewers cannot create", async () => {
    const o = await createOpportunity(bd, input(), S, ctx(bd));
    await expect(updateOpportunity(lead, o.id, input({ name: "Renamed" }), ctx(lead))).resolves.toBeTruthy();
    await expect(
      updateOpportunity(otherPartner, o.id, input({ name: "Hijack" }), ctx(otherPartner)),
    ).rejects.toBeInstanceOf(ForbiddenError);
    await expect(createOpportunity(viewer, input(), S, ctx(viewer))).rejects.toBeInstanceOf(ForbiddenError);
  });

  it("confidential deals are invisible (not just read-only) to non-members", async () => {
    const o = await createOpportunity(lead, input({ confidential: "on", teamIds: teamBd.id }), S, ctx(lead));
    await expect(db.$transaction((tx) => loadVisibleOpportunity(tx, bd, o.id))).rejects.toThrow(
      "Opportunity not found.",
    );
    await expect(db.$transaction((tx) => loadVisibleOpportunity(tx, teamBd, o.id))).resolves.toBeTruthy();
    await expect(changeStage(bd, o.id, stage({ stage: "QUALIFIED" }), S, ctx(bd))).rejects.toThrow(
      "Opportunity not found.",
    );
  });
});

describe("stage changes", () => {
  it("enforces reasons, conflict warnings and records history", async () => {
    const o = await createOpportunity(bd, input({ conflictStatus: "REQUESTED" }), S, ctx(bd));
    await expect(changeStage(lead, o.id, stage({ stage: "PROPOSAL_PREPARING" }), S, ctx(lead))).rejects.toBeInstanceOf(
      ConfirmRequiredError,
    );
    await changeStage(lead, o.id, stage({ stage: "PROPOSAL_PREPARING", confirm: "on" }), S, ctx(lead));

    await expect(changeStage(lead, o.id, stage({ stage: "WON" }), S, ctx(lead))).rejects.toThrow(/reason/);
    const won = await changeStage(
      lead,
      o.id,
      stage({ stage: "WON", outcomeReason: "RELATIONSHIP", outcome: "Client loyalty", confirm: "on" }),
      S,
      ctx(lead),
    );
    expect(won).toMatchObject({
      stage: "WON",
      probability: 100,
      outcomeReason: "RELATIONSHIP",
      outcome: "Client loyalty",
    });
    expect(won.closedDate).not.toBeNull();

    const reopened = await changeStage(lead, o.id, stage({ stage: "SUBMITTED", confirm: "on" }), S, ctx(lead));
    expect(reopened).toMatchObject({
      outcomeReason: null,
      outcome: null,
      closedDate: null,
      probability: S.stageDefaultProbability.SUBMITTED,
    });

    const history = await db.opportunityStageChange.findMany({
      where: { opportunityId: o.id },
      orderBy: { changedAt: "asc" },
    });
    expect(history.map((h) => h.toStage)).toEqual(["LEAD", "PROPOSAL_PREPARING", "WON", "SUBMITTED"]);
    const audit = await db.auditLog.findFirst({
      where: { entityId: o.id, action: "UPDATE" },
      orderBy: { createdAt: "asc" },
    });
    expect(JSON.stringify(audit?.diff)).toContain("acknowledgedWarnings");
  });

  it("cannot win with a conflict", async () => {
    const o = await createOpportunity(bd, input({ conflictStatus: "CONFLICT" }), S, ctx(bd));
    await expect(changeStage(bd, o.id, stage({ stage: "WON", outcomeReason: "PRICE" }), S, ctx(bd))).rejects.toThrow(
      /conflict/,
    );
  });
});

describe("pitches", () => {
  it("creates the five standard checklist items; only custom ones can be removed", async () => {
    const o = await createOpportunity(bd, input(), S, ctx(bd));
    const p = await createPitch(
      lead,
      pitchInputSchema.parse({ opportunityId: o.id, deadline: "2026-12-01T17:00" }),
      ctx(lead),
    );
    expect(p.checklist.map((c) => c.label)).toEqual([
      "Team CVs",
      "Credentials",
      "Fee proposal",
      "Representative matters",
      "Firm profile",
    ]);
    expect(p.deadline.toISOString()).toBe("2026-12-01T10:00:00.000Z");
    await expect(removeChecklistItem(lead, p.id, p.checklist[0].id, ctx(lead))).rejects.toThrow(/Standard/);
    const withExtra = await addChecklistItem(lead, p.id, "Thai translation", ctx(lead));
    const extra = withExtra.checklist.find((c) => c.label === "Thai translation")!;
    await removeChecklistItem(lead, p.id, extra.id, ctx(lead));
    await expect(
      createPitch(
        otherPartner,
        pitchInputSchema.parse({ opportunityId: o.id, deadline: "2026-12-01T17:00" }),
        ctx(otherPartner),
      ),
    ).rejects.toBeInstanceOf(ForbiddenError);
  });
});

describe("links to confidential deals", () => {
  it("non-members cannot attach tasks or activities to a confidential opportunity", async () => {
    const o = await createOpportunity(lead, input({ confidential: "on" }), S, ctx(lead));
    await expect(
      createTask(bd, taskInputSchema.parse({ title: "Peek", opportunityId: o.id }), ctx(bd)),
    ).rejects.toThrow("Opportunity not found.");
    await expect(
      createActivity(
        bd,
        activityInputSchema.parse({ type: "CALL", date: "2026-11-13", summary: "x", opportunityId: o.id }),
        ctx(bd),
      ),
    ).rejects.toThrow("Opportunity not found.");
    const a = await createActivity(
      lead,
      activityInputSchema.parse({ type: "CALL", date: "2026-11-13", summary: "Secret call", opportunityId: o.id }),
      ctx(lead),
    );
    expect(a.organisationId).toBe(orgId); // inferred from the opportunity
  });
});

describe("pipeline summary", () => {
  it("includes confidential deals as anonymous numbers", async () => {
    await createOpportunity(bd, input({ stage: "SUBMITTED" }), S, ctx(bd));
    await createOpportunity(lead, input({ name: "Secret", confidential: "on", stage: "SUBMITTED" }), S, ctx(lead));
    const s = await pipelineSummary(35);
    expect(s.totals.openCount).toBe(2);
    expect(s.totals.confidentialOpen).toBe(1);
    expect(JSON.stringify(s)).not.toContain("Secret");
  });
});
