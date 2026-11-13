import "server-only";
import type { Prisma } from "@/generated/prisma/client";
import { withAudit, type AuditContext } from "@/server/audit";
import { assertCan, type Actor, type ResourceFacts } from "@/server/auth/policy";
import { UserFacingError } from "@/server/actions/result";
import type { AwardInput } from "./schema";

export function awardFacts(a: { ownerId: string | null }): ResourceFacts {
  return { memberIds: a.ownerId ? [a.ownerId] : [] };
}

const include = { practiceAreas: { select: { id: true } } } satisfies Prisma.AwardInclude;
const snap = (a: Prisma.AwardGetPayload<{ include: typeof include }>) => {
  const { practiceAreas, ...rest } = a;
  return { ...rest, practiceAreaIds: practiceAreas.map((p) => p.id).sort() };
};

function scalars(input: AwardInput, ownerId: string) {
  return {
    name: input.name,
    organiser: input.organiser,
    category: input.category,
    year: input.year,
    deadline: input.deadline,
    ownerId,
    status: input.status,
    notes: input.notes,
  };
}

export async function createAward(actor: Actor, input: AwardInput, ctx: AuditContext) {
  assertCan(actor, "create", "Award");
  return withAudit(ctx, async (tx) => {
    const a = await tx.award.create({
      data: {
        ...scalars(input, input.ownerId ?? actor.id),
        practiceAreas: { connect: input.practiceAreaIds.map((id) => ({ id })) },
      },
      include,
    });
    return { result: a, audit: [{ action: "CREATE", entity: "Award", entityId: a.id, after: snap(a) }] };
  });
}

export async function updateAward(actor: Actor, id: string, input: AwardInput, ctx: AuditContext) {
  return withAudit(ctx, async (tx) => {
    const before = await tx.award.findUnique({ where: { id }, include });
    if (!before) throw new UserFacingError("Award not found.");
    assertCan(actor, "update", "Award", awardFacts(before));
    const after = await tx.award.update({
      where: { id },
      data: {
        ...scalars(input, input.ownerId ?? before.ownerId ?? actor.id),
        practiceAreas: { set: input.practiceAreaIds.map((x) => ({ id: x })) },
      },
      include,
    });
    return {
      result: after,
      audit: [{ action: "UPDATE", entity: "Award", entityId: id, before: snap(before), after: snap(after) }],
    };
  });
}

export async function setAwardArchived(actor: Actor, id: string, archived: boolean, ctx: AuditContext) {
  return withAudit(ctx, async (tx) => {
    const before = await tx.award.findUnique({ where: { id } });
    if (!before) throw new UserFacingError("Award not found.");
    assertCan(actor, "archive", "Award", awardFacts(before));
    await tx.award.update({ where: { id }, data: { archivedAt: archived ? new Date() : null } });
    return { result: null, audit: [{ action: archived ? "ARCHIVE" : "RESTORE", entity: "Award", entityId: id }] };
  });
}
