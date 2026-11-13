import "server-only";
import type { Prisma } from "@/generated/prisma/client";
import { withAudit, type AuditContext } from "@/server/audit";
import { assertCan, type Actor, type ResourceFacts } from "@/server/auth/policy";
import { UserFacingError } from "@/server/actions/result";
import type { ContentInput } from "./schema";

export function contentFacts(c: { authors: { id: string }[] }): ResourceFacts {
  return { memberIds: c.authors.map((a) => a.id) };
}

const include = {
  authors: { select: { id: true } },
  practiceAreas: { select: { id: true } },
} satisfies Prisma.ContentInclude;
const snap = (c: Prisma.ContentGetPayload<{ include: typeof include }>) => {
  const { authors, practiceAreas, ...rest } = c;
  return {
    ...rest,
    authorIds: authors.map((a) => a.id).sort(),
    practiceAreaIds: practiceAreas.map((p) => p.id).sort(),
  };
};

function scalars(input: ContentInput) {
  return {
    title: input.title,
    type: input.type,
    channel: input.channel,
    status: input.status,
    publishDate: input.publishDate,
    url: input.url,
    engagementNotes: input.engagementNotes,
  };
}

export async function createContent(actor: Actor, input: ContentInput, ctx: AuditContext) {
  assertCan(actor, "create", "Content");
  return withAudit(ctx, async (tx) => {
    const c = await tx.content.create({
      data: {
        ...scalars(input),
        authors: { connect: input.authorIds.map((id) => ({ id })) },
        practiceAreas: { connect: input.practiceAreaIds.map((id) => ({ id })) },
      },
      include,
    });
    return { result: c, audit: [{ action: "CREATE", entity: "Content", entityId: c.id, after: snap(c) }] };
  });
}

export async function updateContent(actor: Actor, id: string, input: ContentInput, ctx: AuditContext) {
  return withAudit(ctx, async (tx) => {
    const before = await tx.content.findUnique({ where: { id }, include });
    if (!before) throw new UserFacingError("Content not found.");
    assertCan(actor, "update", "Content", contentFacts(before));
    const after = await tx.content.update({
      where: { id },
      data: {
        ...scalars(input),
        authors: { set: input.authorIds.map((x) => ({ id: x })) },
        practiceAreas: { set: input.practiceAreaIds.map((x) => ({ id: x })) },
      },
      include,
    });
    return {
      result: after,
      audit: [{ action: "UPDATE", entity: "Content", entityId: id, before: snap(before), after: snap(after) }],
    };
  });
}

export async function setContentArchived(actor: Actor, id: string, archived: boolean, ctx: AuditContext) {
  return withAudit(ctx, async (tx) => {
    const before = await tx.content.findUnique({ where: { id }, include });
    if (!before) throw new UserFacingError("Content not found.");
    assertCan(actor, "archive", "Content", contentFacts(before));
    await tx.content.update({ where: { id }, data: { archivedAt: archived ? new Date() : null } });
    return { result: null, audit: [{ action: archived ? "ARCHIVE" : "RESTORE", entity: "Content", entityId: id }] };
  });
}
