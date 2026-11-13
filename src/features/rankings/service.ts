import "server-only";
import type { Prisma } from "@/generated/prisma/client";
import { withAudit, type AuditContext } from "@/server/audit";
import { assertCan, type Actor } from "@/server/auth/policy";
import { matterVisibleWhere } from "@/server/auth/visibility";
import { ConfirmRequiredError, UserFacingError } from "@/server/actions/result";
import type { Tx } from "@/server/db";
import { submissionFacts } from "./facts";
import { refereeReuse, refereeWarnings } from "./rules";
import type { SubmissionInput } from "./schema";

const include = {
  rankedLawyers: { select: { id: true } },
  matters: { select: { id: true } },
} satisfies Prisma.DirectorySubmissionInclude;
type Loaded = Prisma.DirectorySubmissionGetPayload<{ include: typeof include }>;

const snap = (s: Loaded) => {
  const { rankedLawyers, matters, ...rest } = s;
  return {
    ...rest,
    rankedLawyerIds: rankedLawyers.map((u) => u.id).sort(),
    matterIds: matters.map((m) => m.id).sort(),
  };
};

async function loadSubmission(tx: Tx, id: string): Promise<Loaded> {
  const s = await tx.directorySubmission.findUnique({ where: { id }, include });
  if (!s) throw new UserFacingError("Submission not found.");
  return s;
}

/**
 * Matters the actor links must be visible to them. Links to confidential matters the actor
 * cannot see are preserved untouched on update (they never reach the form).
 */
async function resolveMatterIds(tx: Tx, actor: Actor, requested: string[], existing: string[] = []): Promise<string[]> {
  const visible = await tx.representativeMatter.findMany({
    where: { AND: [{ id: { in: [...requested, ...existing] } }, matterVisibleWhere(actor, { includeArchived: true })] },
    select: { id: true },
  });
  const visibleIds = new Set(visible.map((m) => m.id));
  const bad = requested.filter((id) => !visibleIds.has(id));
  if (bad.length) throw new UserFacingError("One of the selected matters was not found.", { matterIds: ["Not found"] });
  const hiddenExisting = existing.filter((id) => !visibleIds.has(id));
  return [...new Set([...requested, ...hiddenExisting])];
}

function scalars(input: SubmissionInput, defaultOwnerId: string) {
  return {
    directoryId: input.directoryId,
    year: input.year,
    practiceAreaId: input.practiceAreaId,
    deadline: input.deadline,
    ownerId: input.ownerId ?? defaultOwnerId,
    partnerReviewerId: input.partnerReviewerId,
    status: input.status,
    resultTier: input.resultTier,
    notes: input.notes,
  };
}

export async function createSubmission(actor: Actor, input: SubmissionInput, ctx: AuditContext) {
  assertCan(actor, "create", "DirectorySubmission");
  return withAudit(ctx, async (tx) => {
    const matterIds = await resolveMatterIds(tx, actor, input.matterIds);
    const s = await tx.directorySubmission.create({
      data: {
        ...scalars(input, actor.id),
        rankedLawyers: { connect: input.rankedLawyerIds.map((id) => ({ id })) },
        matters: { connect: matterIds.map((id) => ({ id })) },
      },
      include,
    });
    return { result: s, audit: [{ action: "CREATE", entity: "DirectorySubmission", entityId: s.id, after: snap(s) }] };
  });
}

export async function updateSubmission(actor: Actor, id: string, input: SubmissionInput, ctx: AuditContext) {
  return withAudit(ctx, async (tx) => {
    const before = await loadSubmission(tx, id);
    assertCan(actor, "update", "DirectorySubmission", submissionFacts(before));
    const matterIds = await resolveMatterIds(
      tx,
      actor,
      input.matterIds,
      before.matters.map((m) => m.id),
    );
    const after = await tx.directorySubmission.update({
      where: { id },
      data: {
        ...scalars(input, before.ownerId),
        rankedLawyers: { set: input.rankedLawyerIds.map((x) => ({ id: x })) },
        matters: { set: matterIds.map((x) => ({ id: x })) },
      },
      include,
    });
    return {
      result: after,
      audit: [
        { action: "UPDATE", entity: "DirectorySubmission", entityId: id, before: snap(before), after: snap(after) },
      ],
    };
  });
}

export async function setSubmissionArchived(actor: Actor, id: string, archived: boolean, ctx: AuditContext) {
  return withAudit(ctx, async (tx) => {
    const before = await loadSubmission(tx, id);
    assertCan(actor, "archive", "DirectorySubmission", submissionFacts(before));
    await tx.directorySubmission.update({ where: { id }, data: { archivedAt: archived ? new Date() : null } });
    return {
      result: null,
      audit: [{ action: archived ? "ARCHIVE" : "RESTORE", entity: "DirectorySubmission", entityId: id }],
    };
  });
}

// ── Referees ──────────────────────────────────────────────────────────────

/** All referee uses of a contact (for the reuse warning and the contact page). */
export async function refereeUses(tx: Tx, contactId: string) {
  const rows = await tx.referee.findMany({
    where: { contactId, submission: { archivedAt: null } },
    include: {
      submission: {
        select: {
          id: true,
          year: true,
          directory: { select: { name: true } },
          practiceArea: { select: { name: true } },
        },
      },
    },
  });
  return rows.map((r) => ({
    submissionId: r.submission.id,
    year: r.submission.year,
    directory: r.submission.directory.name,
    practiceArea: r.submission.practiceArea.name,
  }));
}

export async function addReferee(
  actor: Actor,
  submissionId: string,
  input: { contactId: string; notes: string | null; confirm?: boolean },
  ctx: AuditContext,
) {
  return withAudit(ctx, async (tx) => {
    const sub = await loadSubmission(tx, submissionId);
    assertCan(actor, "update", "DirectorySubmission", submissionFacts(sub));
    const contact = await tx.contact.findUnique({ where: { id: input.contactId }, select: { archivedAt: true } });
    if (!contact || contact.archivedAt) throw new UserFacingError("Contact not found.", { contactId: ["Not found"] });
    const reuse = refereeReuse({ id: sub.id, year: sub.year }, await refereeUses(tx, input.contactId));
    if (reuse.warn && !input.confirm) throw new ConfirmRequiredError(refereeWarnings(reuse));
    const exists = await tx.referee.findUnique({
      where: { contactId_submissionId: { contactId: input.contactId, submissionId } },
    });
    if (exists) throw new UserFacingError("This contact is already a referee for this submission.");
    const r = await tx.referee.create({ data: { contactId: input.contactId, submissionId, notes: input.notes } });
    return {
      result: r,
      audit: [
        {
          action: "CREATE",
          entity: "Referee",
          entityId: r.id,
          after: r,
          meta: reuse.warn ? { acknowledgedWarnings: refereeWarnings(reuse) } : undefined,
        },
      ],
    };
  });
}

async function loadRefereeForUpdate(tx: Tx, actor: Actor, refereeId: string) {
  const r = await tx.referee.findUnique({ where: { id: refereeId } });
  if (!r) throw new UserFacingError("Referee not found.");
  const sub = await loadSubmission(tx, r.submissionId);
  assertCan(actor, "update", "DirectorySubmission", submissionFacts(sub));
  return r;
}

export async function setRefereeBriefed(
  actor: Actor,
  refereeId: string,
  briefed: boolean,
  briefedDate: Date | null,
  ctx: AuditContext,
) {
  return withAudit(ctx, async (tx) => {
    const before = await loadRefereeForUpdate(tx, actor, refereeId);
    const after = await tx.referee.update({
      where: { id: refereeId },
      data: { briefed, briefedDate: briefed ? briefedDate : null },
    });
    return { result: after, audit: [{ action: "UPDATE", entity: "Referee", entityId: refereeId, before, after }] };
  });
}

export async function removeReferee(actor: Actor, refereeId: string, ctx: AuditContext) {
  return withAudit(ctx, async (tx) => {
    const before = await loadRefereeForUpdate(tx, actor, refereeId);
    await tx.referee.delete({ where: { id: refereeId } });
    return {
      result: before.submissionId,
      audit: [{ action: "DELETE", entity: "Referee", entityId: refereeId, before }],
    };
  });
}
