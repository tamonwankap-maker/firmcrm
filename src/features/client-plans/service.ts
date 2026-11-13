import "server-only";
import type { Prisma } from "@/generated/prisma/client";
import { withAudit, type AuditContext } from "@/server/audit";
import { assertCan, type Actor, type ResourceFacts } from "@/server/auth/policy";
import { UserFacingError } from "@/server/actions/result";
import type { ClientPlanInput } from "./schema";

/** Members: plan owner and the organisation's relationship partner. */
export function clientPlanFacts(p: {
  ownerId: string | null;
  organisation: { relationshipPartnerId: string | null };
}): ResourceFacts {
  return { memberIds: [p.ownerId, p.organisation.relationshipPartnerId].filter((x): x is string => !!x) };
}

const include = {
  crossSellTargets: { select: { id: true } },
  organisation: { select: { relationshipPartnerId: true } },
} satisfies Prisma.ClientPlanInclude;
const snap = (p: Prisma.ClientPlanGetPayload<{ include: typeof include }>) => {
  const { crossSellTargets, organisation: _o, ...rest } = p;
  return { ...rest, crossSellTargetIds: crossSellTargets.map((t) => t.id).sort() };
};

export async function createClientPlan(actor: Actor, input: ClientPlanInput, ctx: AuditContext) {
  assertCan(actor, "create", "ClientPlan");
  return withAudit(ctx, async (tx) => {
    const org = await tx.organisation.findUnique({ where: { id: input.organisationId }, select: { archivedAt: true } });
    if (!org || org.archivedAt)
      throw new UserFacingError("Choose an active organisation.", { organisationId: ["Not found"] });
    const exists = await tx.clientPlan.findUnique({
      where: { organisationId_year: { organisationId: input.organisationId, year: input.year } },
    });
    if (exists)
      throw new UserFacingError(`There is already a ${input.year} plan for this client.`, { year: ["Already exists"] });
    const p = await tx.clientPlan.create({
      data: {
        organisationId: input.organisationId,
        year: input.year,
        objectives: input.objectives,
        reviewMeetingDate: input.reviewMeetingDate,
        healthScore: input.healthScore,
        ownerId: input.ownerId ?? actor.id,
        crossSellTargets: { connect: input.crossSellTargetIds.map((id) => ({ id })) },
      },
      include,
    });
    return { result: p, audit: [{ action: "CREATE", entity: "ClientPlan", entityId: p.id, after: snap(p) }] };
  });
}

export async function updateClientPlan(
  actor: Actor,
  id: string,
  input: Omit<ClientPlanInput, "organisationId" | "year">,
  ctx: AuditContext,
) {
  return withAudit(ctx, async (tx) => {
    const before = await tx.clientPlan.findUnique({ where: { id }, include });
    if (!before) throw new UserFacingError("Client plan not found.");
    assertCan(actor, "update", "ClientPlan", clientPlanFacts(before));
    const after = await tx.clientPlan.update({
      where: { id },
      data: {
        objectives: input.objectives,
        reviewMeetingDate: input.reviewMeetingDate,
        healthScore: input.healthScore,
        ownerId: input.ownerId ?? before.ownerId,
        crossSellTargets: { set: input.crossSellTargetIds.map((x) => ({ id: x })) },
      },
      include,
    });
    return {
      result: after,
      audit: [{ action: "UPDATE", entity: "ClientPlan", entityId: id, before: snap(before), after: snap(after) }],
    };
  });
}

export async function setClientPlanArchived(actor: Actor, id: string, archived: boolean, ctx: AuditContext) {
  return withAudit(ctx, async (tx) => {
    const before = await tx.clientPlan.findUnique({ where: { id }, include });
    if (!before) throw new UserFacingError("Client plan not found.");
    assertCan(actor, "archive", "ClientPlan", clientPlanFacts(before));
    await tx.clientPlan.update({ where: { id }, data: { archivedAt: archived ? new Date() : null } });
    return { result: null, audit: [{ action: archived ? "ARCHIVE" : "RESTORE", entity: "ClientPlan", entityId: id }] };
  });
}
