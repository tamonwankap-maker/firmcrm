import { afterAll, beforeEach, describe, expect, it } from "vitest";
import {
  addReferee,
  createSubmission,
  removeReferee,
  setRefereeBriefed,
  updateSubmission,
} from "@/features/rankings/service";
import { submissionInputSchema } from "@/features/rankings/schema";
import { getSubmission } from "@/features/rankings/queries";
import { createMatter, updateMatter } from "@/features/matters/service";
import { matterInputSchema } from "@/features/matters/schema";
import { createAward, updateAward } from "@/features/awards/service";
import { awardInputSchema } from "@/features/awards/schema";
import { ConfirmRequiredError, UserFacingError } from "@/server/actions/result";
import { ForbiddenError, type Actor } from "@/server/auth/policy";
import { db, makeOrg, makeUser, resetDb } from "./helpers";

let admin: Actor, bd: Actor, partner: Actor, otherPartner: Actor, viewer: Actor;
let dirL500: string, dirChambers: string, pa: string, contactId: string, orgId: string;
const ctx = (a: Actor) => ({ userId: a.id });

const sub = (v: Record<string, unknown>) =>
  submissionInputSchema.parse({ directoryId: dirL500, year: "2027", practiceAreaId: pa, ...v });
const matter = (v: Record<string, unknown> = {}) =>
  matterInputSchema.parse({
    title: "Green bond",
    year: "2025",
    description: "d",
    practiceAreaIds: pa,
    clientOrganisationId: orgId,
    ...v,
  });

beforeEach(async () => {
  await resetDb();
  [admin, bd, partner, otherPartner, viewer] = await Promise.all([
    makeUser("ADMIN"),
    makeUser("BD"),
    makeUser("PARTNER"),
    makeUser("PARTNER"),
    makeUser("VIEWER"),
  ]);
  dirL500 = (await db.directory.create({ data: { name: "Legal 500" } })).id;
  dirChambers = (await db.directory.create({ data: { name: "Chambers & Partners" } })).id;
  pa = (await db.practiceArea.create({ data: { name: "Capital Markets" } })).id;
  orgId = (await makeOrg("Siam Bank")).id;
  contactId = (await db.contact.create({ data: { nameEn: "Khun GC", organisationId: orgId } })).id;
});
afterAll(() => db.$disconnect());

describe("directory submissions", () => {
  it("one submission per directory, year and practice area", async () => {
    await createSubmission(bd, sub({}), ctx(bd));
    await expect(createSubmission(bd, sub({}), ctx(bd))).rejects.toMatchObject({ code: "P2002" });
  });

  it("only owner, reviewer or ranked lawyers (or BD/Admin) can edit", async () => {
    const s = await createSubmission(bd, sub({ partnerReviewerId: partner.id }), ctx(bd));
    await expect(
      updateSubmission(partner, s.id, sub({ status: "DRAFTING", partnerReviewerId: partner.id }), ctx(partner)),
    ).resolves.toBeTruthy();
    await expect(
      updateSubmission(otherPartner, s.id, sub({ status: "SUBMITTED" }), ctx(otherPartner)),
    ).rejects.toBeInstanceOf(ForbiddenError);
    await expect(createSubmission(viewer, sub({ year: "2028" }), ctx(viewer))).rejects.toBeInstanceOf(ForbiddenError);
  });
});

describe("referees", () => {
  it("warns when the referee was used in the last two years, and records the acknowledgement", async () => {
    const old = await createSubmission(bd, sub({ year: "2026" }), ctx(bd));
    await addReferee(bd, old.id, { contactId, notes: null }, ctx(bd));
    const cur = await createSubmission(bd, sub({ year: "2027" }), ctx(bd));
    const err = await addReferee(bd, cur.id, { contactId, notes: null }, ctx(bd)).catch((e) => e);
    expect(err).toBeInstanceOf(ConfirmRequiredError);
    expect(err.warnings[0]).toBe("Already used as a referee for Legal 500 2026 (Capital Markets).");
    const r = await addReferee(bd, cur.id, { contactId, notes: "Prefers Thai", confirm: true }, ctx(bd));
    const audit = await db.auditLog.findFirst({ where: { entity: "Referee", entityId: r.id } });
    expect(JSON.stringify(audit?.diff)).toContain("acknowledgedWarnings");
    // detail query shows the warning on the referee row
    const detail = await getSubmission(bd, cur.id);
    expect(detail?.referees[0].warnings).toHaveLength(1);
    // duplicates on the same submission are rejected
    await expect(addReferee(bd, cur.id, { contactId, notes: null, confirm: true }, ctx(bd))).rejects.toBeInstanceOf(
      UserFacingError,
    );
  });

  it("no warning for a referee last used three years ago; briefing and removal work", async () => {
    const old = await createSubmission(bd, sub({ year: "2024", directoryId: dirChambers }), ctx(bd));
    await addReferee(bd, old.id, { contactId, notes: null }, ctx(bd));
    const cur = await createSubmission(bd, sub({ year: "2027" }), ctx(bd));
    const r = await addReferee(bd, cur.id, { contactId, notes: null }, ctx(bd));
    const briefed = await setRefereeBriefed(bd, r.id, true, new Date("2026-11-13T00:00:00Z"), ctx(bd));
    expect(briefed.briefed).toBe(true);
    await expect(removeReferee(otherPartner, r.id, ctx(otherPartner))).rejects.toBeInstanceOf(ForbiddenError);
    await removeReferee(bd, r.id, ctx(bd));
    expect(await db.referee.count({ where: { submissionId: cur.id } })).toBe(0);
  });
});

describe("representative matters", () => {
  it("database refuses confidential + publishable and anonymised without a description", async () => {
    await expect(
      db.representativeMatter.create({
        data: { title: "x", year: 2025, description: "d", confidential: true, publishable: true },
      }),
    ).rejects.toThrow();
    await expect(
      db.representativeMatter.create({ data: { title: "x", year: 2025, description: "d", anonymised: true } }),
    ).rejects.toThrow();
  });

  it("confidential matters: creator must be on the team; non-members cannot link them", async () => {
    await expect(createMatter(bd, matter({ confidential: "on" }), ctx(bd))).rejects.toBeInstanceOf(UserFacingError);
    const secret = await createMatter(
      partner,
      matter({ title: "Secret deal", confidential: "on", teamIds: partner.id }),
      ctx(partner),
    );
    await expect(updateMatter(bd, secret.id, matter({ title: "x" }), ctx(bd))).rejects.toThrow("Matter not found.");
    await expect(createSubmission(bd, sub({ matterIds: secret.id }), ctx(bd))).rejects.toThrow(/not found/);
  });

  it("a non-member editing a submission keeps confidential links they cannot see", async () => {
    const pub = await createMatter(bd, matter({ title: "Public" }), ctx(bd));
    const secret = await createMatter(
      partner,
      matter({ title: "Secret", confidential: "on", teamIds: partner.id }),
      ctx(partner),
    );
    const s = await createSubmission(partner, sub({ matterIds: [pub.id, secret.id] }), ctx(partner));

    const viewForBd = await getSubmission(bd, s.id);
    expect(viewForBd?.matters.map((m) => m.title)).toEqual(["Public"]);
    expect(viewForBd?.hiddenMatters).toBe(1);

    await updateSubmission(bd, s.id, sub({ matterIds: [pub.id], notes: "edited by BD" }), ctx(bd)); // BD only sees "Public"
    const linked = await db.directorySubmission.findUniqueOrThrow({ where: { id: s.id }, include: { matters: true } });
    expect(linked.matters.map((m) => m.title).sort()).toEqual(["Public", "Secret"]);
    expect(admin).toBeTruthy();
  });
});

describe("awards", () => {
  it("owner or BD can edit; other partners cannot", async () => {
    const a = await createAward(
      partner,
      awardInputSchema.parse({ name: "ALB", category: "Deal of the Year", year: "2026" }),
      ctx(partner),
    );
    expect(a.ownerId).toBe(partner.id);
    const input = awardInputSchema.parse({
      name: "ALB",
      category: "Deal of the Year",
      year: "2026",
      status: "SHORTLISTED",
    });
    await expect(updateAward(otherPartner, a.id, input, ctx(otherPartner))).rejects.toBeInstanceOf(ForbiddenError);
    await expect(updateAward(bd, a.id, input, ctx(bd))).resolves.toMatchObject({
      status: "SHORTLISTED",
      ownerId: partner.id,
    });
  });
});
