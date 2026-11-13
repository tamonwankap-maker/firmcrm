import "server-only";
import type { Prisma } from "@/generated/prisma/client";
import { withAudit, type AuditContext } from "@/server/audit";
import { assertCan, type Actor } from "@/server/auth/policy";
import { matterVisibleWhere } from "@/server/auth/visibility";
import { UserFacingError } from "@/server/actions/result";
import type { Tx } from "@/server/db";
import { matterFacts } from "./facts";
import type { MatterInput } from "./schema";

const include = {
  team: { select: { id: true } },
  practiceAreas: { select: { id: true } },
} satisfies Prisma.RepresentativeMatterInclude;
type Loaded = Prisma.RepresentativeMatterGetPayload<{ include: typeof include }>;

const snap = (m: Loaded) => {
  const { team, practiceAreas, ...rest } = m;
  return { ...rest, teamIds: team.map((t) => t.id).sort(), practiceAreaIds: practiceAreas.map((p) => p.id).sort() };
};

export async function loadVisibleMatter(tx: Tx, actor: Actor, id: string): Promise<Loaded> {
  const m = await tx.representativeMatter.findFirst({
    where: { AND: [{ id }, matterVisibleWhere(actor, { includeArchived: true })] },
    include,
  });
  if (!m) throw new UserFacingError("Matter not found.");
  return m;
}

function assertConfidentialAccess(actor: Actor, input: MatterInput) {
  if (input.confidential && actor.role !== "ADMIN" && !input.teamIds.includes(actor.id)) {
    throw new UserFacingError("Add yourself to the team to keep access to a confidential matter.", {
      confidential: ["You would lose access to this matter"],
    });
  }
}

function scalars(input: MatterInput) {
  return {
    title: input.title,
    clientOrganisationId: input.clientOrganisationId,
    clientDisplayName: input.clientDisplayName,
    anonymised: input.anonymised,
    value: input.value,
    currency: input.currency,
    year: input.year,
    publishable: input.publishable,
    confidential: input.confidential,
    description: input.description,
  };
}

export async function createMatter(actor: Actor, input: MatterInput, ctx: AuditContext) {
  assertCan(actor, "create", "RepresentativeMatter");
  assertConfidentialAccess(actor, input);
  return withAudit(ctx, async (tx) => {
    const m = await tx.representativeMatter.create({
      data: {
        ...scalars(input),
        team: { connect: input.teamIds.map((id) => ({ id })) },
        practiceAreas: { connect: input.practiceAreaIds.map((id) => ({ id })) },
      },
      include,
    });
    return { result: m, audit: [{ action: "CREATE", entity: "RepresentativeMatter", entityId: m.id, after: snap(m) }] };
  });
}

export async function updateMatter(actor: Actor, id: string, input: MatterInput, ctx: AuditContext) {
  return withAudit(ctx, async (tx) => {
    const before = await loadVisibleMatter(tx, actor, id);
    assertCan(actor, "update", "RepresentativeMatter", matterFacts(before));
    assertConfidentialAccess(actor, input);
    const after = await tx.representativeMatter.update({
      where: { id },
      data: {
        ...scalars(input),
        team: { set: input.teamIds.map((x) => ({ id: x })) },
        practiceAreas: { set: input.practiceAreaIds.map((x) => ({ id: x })) },
      },
      include,
    });
    return {
      result: after,
      audit: [
        { action: "UPDATE", entity: "RepresentativeMatter", entityId: id, before: snap(before), after: snap(after) },
      ],
    };
  });
}

export async function setMatterArchived(actor: Actor, id: string, archived: boolean, ctx: AuditContext) {
  return withAudit(ctx, async (tx) => {
    const before = await loadVisibleMatter(tx, actor, id);
    assertCan(actor, "archive", "RepresentativeMatter", matterFacts(before));
    await tx.representativeMatter.update({ where: { id }, data: { archivedAt: archived ? new Date() : null } });
    return {
      result: null,
      audit: [{ action: archived ? "ARCHIVE" : "RESTORE", entity: "RepresentativeMatter", entityId: id }],
    };
  });
}
