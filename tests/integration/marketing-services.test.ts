import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { addInvites, createEvent, updateInvite } from "@/features/events/service";
import { eventInputSchema } from "@/features/events/schema";
import { createContent, updateContent } from "@/features/content/service";
import { contentInputSchema } from "@/features/content/schema";
import { createClientPlan, updateClientPlan } from "@/features/client-plans/service";
import { clientPlanInputSchema } from "@/features/client-plans/schema";
import { getClientPlan } from "@/features/client-plans/queries";
import { ConfirmRequiredError, UserFacingError } from "@/server/actions/result";
import { ForbiddenError, type Actor } from "@/server/auth/policy";
import { db, makeOrg, makeUser, resetDb } from "./helpers";

let bd: Actor, partner: Actor, otherPartner: Actor, viewer: Actor;
let orgId: string, tagId: string, consenting: string, notConsenting: string;
const ctx = (a: Actor) => ({ userId: a.id });
const ev = (v: Record<string, unknown> = {}) =>
  eventInputSchema.parse({ title: "Breakfast briefing", startsAt: "2026-12-04T08:30", venue: "Hotel", ...v });

beforeEach(async () => {
  await resetDb();
  [bd, partner, otherPartner, viewer] = await Promise.all([
    makeUser("BD"),
    makeUser("PARTNER"),
    makeUser("PARTNER"),
    makeUser("VIEWER"),
  ]);
  orgId = (await makeOrg("Siam Bank")).id;
  tagId = (await db.tag.create({ data: { name: "CFO" } })).id;
  consenting = (
    await db.contact.create({
      data: {
        nameEn: "Opted In",
        organisationId: orgId,
        tags: { connect: [{ id: tagId }] },
        consents: {
          create: { list: "EVENT_INVITES", optedIn: true, consentDate: new Date("2026-01-01"), source: "WEB_FORM" },
        },
      },
    })
  ).id;
  notConsenting = (
    await db.contact.create({
      data: { nameEn: "No Consent", organisationId: orgId, tags: { connect: [{ id: tagId }] } },
    })
  ).id;
});
afterAll(() => db.$disconnect());

describe("event invitations (PDPA)", () => {
  it("warns about contacts without consent; can skip them or add anyway", async () => {
    const e = await createEvent(bd, ev(), ctx(bd));
    const err = await addInvites(bd, e.id, { contactIds: [], tagId }, ctx(bd)).catch((x) => x);
    expect(err).toBeInstanceOf(ConfirmRequiredError);
    expect(err.warnings[0]).toContain("No Consent");

    expect(await addInvites(bd, e.id, { contactIds: [], tagId, onlyConsented: true }, ctx(bd))).toEqual({
      added: 1,
      skipped: 1,
    });
    expect(await addInvites(bd, e.id, { contactIds: [notConsenting], confirm: true }, ctx(bd))).toEqual({
      added: 1,
      skipped: 0,
    });
    await expect(
      addInvites(bd, e.id, { contactIds: [], organisationId: orgId, confirm: true }, ctx(bd)),
    ).rejects.toThrow(/already on the list/);
    const audit = await db.auditLog.findMany({ where: { entity: "EventInvite", entityId: e.id } });
    expect(audit).toHaveLength(2);
  });

  it("RSVP implies invited; follow-up owners can only tick their follow-up", async () => {
    const e = await createEvent(bd, ev(), ctx(bd));
    await addInvites(bd, e.id, { contactIds: [consenting] }, ctx(bd));
    const inv = await db.eventInvite.findFirstOrThrow({ where: { eventId: e.id } });
    const after = await updateInvite(bd, inv.id, { rsvp: "YES" }, ctx(bd));
    expect(after).toMatchObject({ rsvp: "YES", invited: true });
    expect(after.invitedAt).not.toBeNull();

    await updateInvite(bd, inv.id, { attended: true, followUpOwnerId: otherPartner.id }, ctx(bd));
    await expect(updateInvite(otherPartner, inv.id, { rsvp: "NO" }, ctx(otherPartner))).rejects.toBeInstanceOf(
      ForbiddenError,
    );
    await expect(updateInvite(otherPartner, inv.id, { followUpDone: true }, ctx(otherPartner))).resolves.toMatchObject({
      followUpDone: true,
    });
    await expect(updateInvite(partner, inv.id, { followUpDone: false }, ctx(partner))).rejects.toBeInstanceOf(
      ForbiddenError,
    );
  });

  it("speakers and the owner can manage the event; viewers cannot create", async () => {
    const e = await createEvent(bd, ev({ speakerIds: partner.id }), ctx(bd));
    await expect(addInvites(partner, e.id, { contactIds: [consenting] }, ctx(partner))).resolves.toEqual({
      added: 1,
      skipped: 0,
    });
    await expect(
      addInvites(otherPartner, e.id, { contactIds: [notConsenting], confirm: true }, ctx(otherPartner)),
    ).rejects.toBeInstanceOf(ForbiddenError);
    await expect(createEvent(viewer, ev(), ctx(viewer))).rejects.toBeInstanceOf(ForbiddenError);
  });
});

describe("content", () => {
  it("authors can edit their own items", async () => {
    const input = contentInputSchema.parse({ title: "Alert", type: "CLIENT_ALERT", authorIds: partner.id });
    const c = await createContent(bd, input, ctx(bd));
    const published = contentInputSchema.parse({
      title: "Alert",
      type: "CLIENT_ALERT",
      authorIds: partner.id,
      status: "PUBLISHED",
      publishDate: "2026-11-01",
    });
    await expect(updateContent(partner, c.id, published, ctx(partner))).resolves.toMatchObject({ status: "PUBLISHED" });
    await expect(updateContent(otherPartner, c.id, published, ctx(otherPartner))).rejects.toBeInstanceOf(
      ForbiddenError,
    );
  });
});

describe("client plans", () => {
  it("one plan per client per year; relationship partner may edit", async () => {
    await db.organisation.update({ where: { id: orgId }, data: { relationshipPartnerId: partner.id } });
    const input = clientPlanInputSchema.parse({ organisationId: orgId, year: "2026", objectives: "Grow" });
    const p = await createClientPlan(bd, input, ctx(bd));
    await expect(createClientPlan(bd, input, ctx(bd))).rejects.toBeInstanceOf(UserFacingError);
    const upd = {
      objectives: "Grow more",
      crossSellTargetIds: [],
      reviewMeetingDate: null,
      healthScore: 2,
      ownerId: null,
    };
    await expect(updateClientPlan(partner, p.id, upd, ctx(partner))).resolves.toMatchObject({
      healthScore: 2,
      ownerId: bd.id,
    });
    await expect(updateClientPlan(otherPartner, p.id, upd, ctx(otherPartner))).rejects.toBeInstanceOf(ForbiddenError);
  });

  it("cross-sell analysis ignores confidential opportunities the user cannot see", async () => {
    const tax = await db.practiceArea.create({ data: { name: "Tax" } });
    const p = await createClientPlan(
      bd,
      clientPlanInputSchema.parse({ organisationId: orgId, year: "2026", objectives: "x", crossSellTargetIds: tax.id }),
      ctx(bd),
    );
    await db.opportunity.create({
      data: {
        name: "Secret tax deal",
        organisationId: orgId,
        source: "INBOUND",
        leadPartnerId: partner.id,
        confidential: true,
        practiceAreas: { connect: [{ id: tax.id }] },
      },
    });
    expect((await getClientPlan(bd, p.id))?.gaps[0].status).toBe("gap");
    expect((await getClientPlan(partner, p.id))?.gaps[0].status).toBe("in_pipeline");
  });
});
