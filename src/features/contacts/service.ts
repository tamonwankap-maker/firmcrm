import "server-only";
import { db, type Tx } from "@/server/db";
import { withAudit, type AuditContext } from "@/server/audit";
import { assertCan, can, type Actor } from "@/server/auth/policy";
import { DuplicateError, UserFacingError, type DuplicateMatch } from "@/server/actions/result";
import { personNameKey } from "../organisations/dedupe";
import type { ContactInput } from "./schema";

import { contactFacts } from "./facts";

export { contactFacts };

/** Same email, or same normalised name at the same organisation. */
export async function findContactDuplicates(
  input: Pick<ContactInput, "nameEn" | "email" | "organisationId">,
  excludeId?: string,
): Promise<DuplicateMatch[]> {
  const key = personNameKey(input.nameEn);
  const rows = await db.contact.findMany({
    where: {
      archivedAt: null,
      id: excludeId ? { not: excludeId } : undefined,
      OR: [
        ...(input.email ? [{ email: { equals: input.email, mode: "insensitive" as const } }] : []),
        { nameKey: key, organisationId: input.organisationId ?? null },
      ],
    },
    take: 5,
    select: { id: true, nameEn: true, email: true, organisation: { select: { nameEn: true } } },
  });
  return rows.map((c) => ({
    id: c.id,
    label: c.nameEn,
    sub: [c.organisation?.nameEn, c.email].filter(Boolean).join(" · ") || undefined,
    href: `/contacts/${c.id}`,
  }));
}

/** Resolve tag names to ids; creating new tags needs Tag:create (BD/ADMIN). */
export async function resolveTags(tx: Tx, actor: Actor, names: string[]): Promise<string[]> {
  if (!names.length) return [];
  const existing = await tx.tag.findMany({
    where: { OR: names.map((n) => ({ name: { equals: n, mode: "insensitive" as const } })) },
  });
  const missing = names.filter((n) => !existing.some((e) => e.name.toLowerCase() === n.toLowerCase()));
  if (missing.length && !can(actor, "create", "Tag")) {
    throw new UserFacingError(`New tags can only be created by the BD team: ${missing.join(", ")}`, {
      tags: ["Use existing tags only"],
    });
  }
  const created = await Promise.all(missing.map((name) => tx.tag.create({ data: { name } })));
  return [...existing, ...created].map((t) => t.id);
}

const include = { owners: { select: { id: true } }, tags: { select: { name: true } } } as const;

function snap(c: { owners: { id: string }[]; tags: { name: string }[]; nameKey?: string; [k: string]: unknown }) {
  const { owners, tags, nameKey: _k, ...rest } = c;
  return { ...rest, ownerIds: owners.map((o) => o.id).sort(), tags: tags.map((t) => t.name).sort() };
}

function scalarData(input: ContactInput) {
  return {
    nameEn: input.nameEn,
    nameTh: input.nameTh,
    nameKey: personNameKey(input.nameEn),
    title: input.title,
    organisationId: input.organisationId,
    email: input.email,
    phone: input.phone,
    linkedinUrl: input.linkedinUrl,
    relationshipStrength: input.relationshipStrength,
    preferredLanguage: input.preferredLanguage,
    notes: input.notes,
  };
}

export async function createContact(actor: Actor, input: ContactInput, ctx: AuditContext) {
  assertCan(actor, "create", "Contact");
  if (!input.confirmDuplicate) {
    const dupes = await findContactDuplicates(input);
    if (dupes.length) throw new DuplicateError(dupes);
  }
  const ownerIds = input.ownerIds.length ? input.ownerIds : [actor.id];
  return withAudit(ctx, async (tx) => {
    const tagIds = await resolveTags(tx, actor, input.tags);
    const c = await tx.contact.create({
      data: {
        ...scalarData(input),
        createdById: actor.id,
        owners: { connect: ownerIds.map((id) => ({ id })) },
        tags: { connect: tagIds.map((id) => ({ id })) },
      },
      include,
    });
    return { result: c, audit: [{ action: "CREATE", entity: "Contact", entityId: c.id, after: snap(c) }] };
  });
}

export async function updateContact(actor: Actor, id: string, input: ContactInput, ctx: AuditContext) {
  return withAudit(ctx, async (tx) => {
    const before = await tx.contact.findUnique({ where: { id }, include });
    if (!before) throw new UserFacingError("Contact not found.");
    assertCan(actor, "update", "Contact", contactFacts(before));
    const tagIds = await resolveTags(tx, actor, input.tags);
    const after = await tx.contact.update({
      where: { id },
      data: {
        ...scalarData(input),
        owners: {
          set: (input.ownerIds.length ? input.ownerIds : before.owners.map((o) => o.id)).map((x) => ({ id: x })),
        },
        tags: { set: tagIds.map((x) => ({ id: x })) },
      },
      include,
    });
    return {
      result: after,
      audit: [{ action: "UPDATE", entity: "Contact", entityId: id, before: snap(before), after: snap(after) }],
    };
  });
}

export async function setContactArchived(actor: Actor, id: string, archived: boolean, ctx: AuditContext) {
  return withAudit(ctx, async (tx) => {
    const before = await tx.contact.findUnique({ where: { id }, include });
    if (!before) throw new UserFacingError("Contact not found.");
    assertCan(actor, "archive", "Contact", contactFacts(before));
    await tx.contact.update({ where: { id }, data: { archivedAt: archived ? new Date() : null } });
    return { result: null, audit: [{ action: archived ? "ARCHIVE" : "RESTORE", entity: "Contact", entityId: id }] };
  });
}
