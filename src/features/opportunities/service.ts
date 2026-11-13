import "server-only";
import type { Prisma } from "@/generated/prisma/client";
import { withAudit, type AuditContext } from "@/server/audit";
import { assertCan, type Actor } from "@/server/auth/policy";
import { opportunityVisibleWhere } from "@/server/auth/visibility";
import { ConfirmRequiredError, UserFacingError } from "@/server/actions/result";
import type { Tx } from "@/server/db";
import { todayInBangkok } from "@/lib/dates";
import type { Settings } from "../settings/schema";
import { opportunityFacts } from "./facts";
import { checkStageChange, closingFields, probabilityForStage } from "./rules";
import type { OpportunityInput, StageChangeInputForm } from "./schema";

export { opportunityFacts };

const include = {
  team: { select: { id: true } },
  practiceAreas: { select: { id: true } },
} satisfies Prisma.OpportunityInclude;

type Loaded = Prisma.OpportunityGetPayload<{ include: typeof include }>;

function snap(o: Loaded) {
  const { team, practiceAreas, ...rest } = o;
  return { ...rest, teamIds: team.map((t) => t.id).sort(), practiceAreaIds: practiceAreas.map((p) => p.id).sort() };
}

/** Load an opportunity the actor may see. Hidden and missing look the same (no existence leak). */
export async function loadVisibleOpportunity(tx: Tx, actor: Actor, id: string): Promise<Loaded> {
  const o = await tx.opportunity.findFirst({
    where: { AND: [{ id }, opportunityVisibleWhere(actor, { includeArchived: true })] },
    include,
  });
  if (!o) throw new UserFacingError("Opportunity not found.");
  return o;
}

/** Someone who marks a deal confidential must stay able to see it. */
function assertConfidentialAccess(actor: Actor, input: OpportunityInput) {
  if (!input.confidential || actor.role === "ADMIN") return;
  if (input.leadPartnerId !== actor.id && !input.teamIds.includes(actor.id)) {
    throw new UserFacingError(
      "Add yourself to the team (or make yourself lead partner) to keep access to a confidential opportunity.",
      {
        confidential: ["You would lose access to this opportunity"],
      },
    );
  }
}

async function assertLinkedRecords(tx: Tx, input: OpportunityInput) {
  const org = await tx.organisation.findUnique({ where: { id: input.organisationId }, select: { archivedAt: true } });
  if (!org || org.archivedAt)
    throw new UserFacingError("Choose an active organisation.", { organisationId: ["Not found"] });
  const lead = await tx.user.findUnique({ where: { id: input.leadPartnerId }, select: { active: true } });
  if (!lead?.active) throw new UserFacingError("Choose an active lead partner.", { leadPartnerId: ["Not found"] });
}

function data(input: OpportunityInput) {
  const teamIds = input.teamIds.filter((id) => id !== input.leadPartnerId);
  return {
    scalars: {
      name: input.name,
      organisationId: input.organisationId,
      source: input.source,
      referrerOrgId: input.referrerOrgId,
      referrerContactId: input.referrerContactId,
      leadPartnerId: input.leadPartnerId,
      feeEstimateMin: input.feeEstimateMin,
      feeEstimateMax: input.feeEstimateMax,
      currency: input.currency,
      conflictStatus: input.conflictStatus,
      expectedDecisionDate: input.expectedDecisionDate,
      competitors: input.competitors,
      confidential: input.confidential,
    },
    teamIds,
  };
}

export async function createOpportunity(actor: Actor, input: OpportunityInput, settings: Settings, ctx: AuditContext) {
  assertCan(actor, "create", "Opportunity");
  assertConfidentialAccess(actor, input);
  return withAudit(ctx, async (tx) => {
    await assertLinkedRecords(tx, input);
    const { scalars, teamIds } = data(input);
    const o = await tx.opportunity.create({
      data: {
        ...scalars,
        stage: input.stage,
        probability: input.probability ?? settings.stageDefaultProbability[input.stage],
        createdById: actor.id,
        team: { connect: teamIds.map((id) => ({ id })) },
        practiceAreas: { connect: input.practiceAreaIds.map((id) => ({ id })) },
        stageChanges: { create: { fromStage: null, toStage: input.stage, changedById: actor.id } },
      },
      include,
    });
    return { result: o, audit: [{ action: "CREATE", entity: "Opportunity", entityId: o.id, after: snap(o) }] };
  });
}

export async function updateOpportunity(actor: Actor, id: string, input: OpportunityInput, ctx: AuditContext) {
  return withAudit(ctx, async (tx) => {
    const before = await loadVisibleOpportunity(tx, actor, id);
    assertCan(actor, "update", "Opportunity", opportunityFacts(before));
    assertConfidentialAccess(actor, input);
    await assertLinkedRecords(tx, input);
    const { scalars, teamIds } = data(input);
    const after = await tx.opportunity.update({
      where: { id },
      data: {
        ...scalars,
        probability: input.probability ?? before.probability,
        team: { set: teamIds.map((x) => ({ id: x })) },
        practiceAreas: { set: input.practiceAreaIds.map((x) => ({ id: x })) },
      },
      include,
    });
    return {
      result: after,
      audit: [{ action: "UPDATE", entity: "Opportunity", entityId: id, before: snap(before), after: snap(after) }],
    };
  });
}

export async function changeStage(
  actor: Actor,
  id: string,
  input: StageChangeInputForm,
  settings: Settings,
  ctx: AuditContext,
) {
  return withAudit(ctx, async (tx) => {
    const before = await loadVisibleOpportunity(tx, actor, id);
    assertCan(actor, "update", "Opportunity", opportunityFacts(before));
    const check = checkStageChange({
      from: before.stage,
      to: input.stage,
      conflictStatus: before.conflictStatus,
      outcomeReason: input.outcomeReason,
    });
    const errors = Object.entries(check.errors);
    if (errors.length) {
      throw new UserFacingError(errors[0][1], Object.fromEntries(errors.map(([k, v]) => [k, [v]])));
    }
    if (check.warnings.length && !input.confirm) throw new ConfirmRequiredError(check.warnings);

    const after = await tx.opportunity.update({
      where: { id },
      data: {
        stage: input.stage,
        probability: probabilityForStage(input.stage, settings.stageDefaultProbability),
        ...closingFields(input.stage, input, todayInBangkok()),
        stageChanges: { create: { fromStage: before.stage, toStage: input.stage, changedById: actor.id } },
      },
      include,
    });
    return {
      result: after,
      audit: [
        {
          action: "UPDATE",
          entity: "Opportunity",
          entityId: id,
          before: snap(before),
          after: snap(after),
          meta: check.warnings.length ? { acknowledgedWarnings: check.warnings } : undefined,
        },
      ],
    };
  });
}

export async function setOpportunityArchived(actor: Actor, id: string, archived: boolean, ctx: AuditContext) {
  return withAudit(ctx, async (tx) => {
    const before = await loadVisibleOpportunity(tx, actor, id);
    assertCan(actor, "archive", "Opportunity", opportunityFacts(before));
    await tx.opportunity.update({ where: { id }, data: { archivedAt: archived ? new Date() : null } });
    return { result: null, audit: [{ action: archived ? "ARCHIVE" : "RESTORE", entity: "Opportunity", entityId: id }] };
  });
}
