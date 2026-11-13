import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  activityVisibleWhere,
  matterVisibleWhere,
  opportunityEditableWhere,
  opportunityVisibleWhere,
  pitchVisibleWhere,
  taskVisibleWhere,
} from "@/server/auth/visibility";
import { db, makeOrg, makeUser, resetDb } from "./helpers";

/**
 * Real-database checks that the row filters hide confidential records correctly.
 * Setup: one public opportunity and one confidential opportunity led by `lead`, with `teamBd` on the team.
 */
let ids: Record<string, string>;
const actors: Record<string, { id: string; role: "ADMIN" | "BD" | "PARTNER" | "VIEWER" }> = {};

beforeAll(async () => {
  await resetDb();
  const [admin, bd, teamBd, lead, partner, viewer] = await Promise.all([
    makeUser("ADMIN"),
    makeUser("BD"),
    makeUser("BD"),
    makeUser("PARTNER"),
    makeUser("PARTNER"),
    makeUser("VIEWER"),
  ]);
  Object.assign(actors, { admin, bd, teamBd, lead, partner, viewer });
  const org = await makeOrg();
  const base = { organisationId: org.id, source: "INBOUND" as const, leadPartnerId: lead.id };
  const pub = await db.opportunity.create({ data: { ...base, name: "Public deal" } });
  const conf = await db.opportunity.create({
    data: { ...base, name: "Secret deal", confidential: true, team: { connect: [{ id: teamBd.id }] } },
  });
  const archived = await db.opportunity.create({ data: { ...base, name: "Old deal", archivedAt: new Date() } });
  const confActivity = await db.activity.create({
    data: {
      type: "MEETING",
      date: new Date("2026-11-01"),
      summary: "Secret meeting",
      ownerId: lead.id,
      opportunityId: conf.id,
    },
  });
  const plainActivity = await db.activity.create({
    data: { type: "CALL", date: new Date("2026-11-01"), summary: "General call", ownerId: lead.id },
  });
  const confPitch = await db.pitch.create({ data: { opportunityId: conf.id, deadline: new Date(), ownerId: lead.id } });
  const confTask = await db.task.create({ data: { title: "Prep secret", ownerId: lead.id, opportunityId: conf.id } });
  const confPitchTask = await db.task.create({ data: { title: "Pitch CVs", ownerId: lead.id, pitchId: confPitch.id } });
  const plainTask = await db.task.create({ data: { title: "Call client", ownerId: lead.id } });
  const pubMatter = await db.representativeMatter.create({ data: { title: "IPO", year: 2025, description: "x" } });
  const confMatter = await db.representativeMatter.create({
    data: {
      title: "Secret M&A",
      year: 2025,
      description: "x",
      confidential: true,
      team: { connect: [{ id: partner.id }] },
    },
  });
  ids = {
    pub: pub.id,
    conf: conf.id,
    archived: archived.id,
    confActivity: confActivity.id,
    plainActivity: plainActivity.id,
    confPitch: confPitch.id,
    confTask: confTask.id,
    confPitchTask: confPitchTask.id,
    plainTask: plainTask.id,
    pubMatter: pubMatter.id,
    confMatter: confMatter.id,
  };
});

afterAll(() => db.$disconnect());

async function visibleOpps(name: string) {
  const rows = await db.opportunity.findMany({ where: opportunityVisibleWhere(actors[name]), select: { id: true } });
  return rows.map((r) => r.id).sort();
}

describe("opportunity visibility", () => {
  it("ADMIN sees all non-archived", async () => expect(await visibleOpps("admin")).toEqual([ids.pub, ids.conf].sort()));
  it("BD not on team sees only public", async () => expect(await visibleOpps("bd")).toEqual([ids.pub]));
  it("BD on team sees confidential", async () =>
    expect(await visibleOpps("teamBd")).toEqual([ids.pub, ids.conf].sort()));
  it("lead partner sees confidential", async () =>
    expect(await visibleOpps("lead")).toEqual([ids.pub, ids.conf].sort()));
  it("other partner sees only public", async () => expect(await visibleOpps("partner")).toEqual([ids.pub]));
  it("VIEWER sees only public", async () => expect(await visibleOpps("viewer")).toEqual([ids.pub]));
  it("archived records are hidden unless requested", async () => {
    const all = await db.opportunity.findMany({
      where: opportunityVisibleWhere(actors.admin, { includeArchived: true }),
    });
    expect(all.map((o) => o.id)).toContain(ids.archived);
  });
});

describe("opportunity editability", () => {
  const editable = async (name: string) =>
    (await db.opportunity.findMany({ where: opportunityEditableWhere(actors[name]), select: { id: true } })).map(
      (r) => r.id,
    );
  it("other partner cannot edit anything they are not on", async () => expect(await editable("partner")).toEqual([]));
  it("lead partner can edit their deals", async () =>
    expect((await editable("lead")).sort()).toEqual([ids.pub, ids.conf, ids.archived].sort()));
  it("VIEWER can edit nothing", async () => expect(await editable("viewer")).toEqual([]));
  it("BD can edit public deals but not confidential ones they are not on", async () => {
    const e = await editable("bd");
    expect(e).toContain(ids.pub);
    expect(e).not.toContain(ids.conf);
  });
});

describe("linked records inherit opportunity confidentiality", () => {
  it("activities", async () => {
    const forViewer = await db.activity.findMany({ where: activityVisibleWhere(actors.viewer) });
    expect(forViewer.map((a) => a.id)).toEqual([ids.plainActivity]);
    const forTeam = await db.activity.findMany({ where: activityVisibleWhere(actors.teamBd) });
    expect(forTeam).toHaveLength(2);
  });
  it("pitches", async () => {
    expect(await db.pitch.count({ where: pitchVisibleWhere(actors.bd) })).toBe(0);
    expect(await db.pitch.count({ where: pitchVisibleWhere(actors.lead) })).toBe(1);
  });
  it("tasks (direct and via pitch)", async () => {
    const bdTasks = (await db.task.findMany({ where: taskVisibleWhere(actors.bd) })).map((t) => t.id);
    expect(bdTasks).toEqual([ids.plainTask]);
    const leadTasks = await db.task.findMany({ where: taskVisibleWhere(actors.lead) });
    expect(leadTasks).toHaveLength(3);
  });
});

describe("representative matter visibility", () => {
  const visible = async (name: string) =>
    (await db.representativeMatter.findMany({ where: matterVisibleWhere(actors[name]) })).map((m) => m.id).sort();
  it("team member sees confidential matter", async () =>
    expect(await visible("partner")).toEqual([ids.pubMatter, ids.confMatter].sort()));
  it("non-member BD does not", async () => expect(await visible("bd")).toEqual([ids.pubMatter]));
  it("VIEWER does not", async () => expect(await visible("viewer")).toEqual([ids.pubMatter]));
});
