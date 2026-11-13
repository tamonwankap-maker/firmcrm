import "server-only";
import type { Prisma } from "@/generated/prisma/client";
import { db } from "@/server/db";
import { withAudit, type AuditContext } from "@/server/audit";
import { assertCan, type Actor } from "@/server/auth/policy";
import { DuplicateError, UserFacingError, type DuplicateMatch } from "@/server/actions/result";
import { omit } from "@/lib/omit";
import { orgNameKey, orgNameThKey } from "./dedupe";
import type { OrganisationInput } from "./schema";

import { organisationFacts } from "./facts";

export { organisationFacts };

/**
 * Possible duplicates: same normalised EN/TH name, or a close trigram match (similarity ≥ 0.5).
 */
export async function findOrganisationDuplicates(
  nameEn: string,
  nameTh: string | null,
  excludeId?: string,
): Promise<DuplicateMatch[]> {
  const key = orgNameKey(nameEn);
  const thKey = orgNameThKey(nameTh);
  const exact = await db.organisation.findMany({
    where: {
      archivedAt: null,
      id: excludeId ? { not: excludeId } : undefined,
      OR: [{ nameKey: key }, ...(thKey ? [{ nameThKey: thKey }] : [])],
    },
    select: { id: true, nameEn: true, nameTh: true },
    take: 5,
  });
  // Fuzzy match on the normalised keys (legal forms stripped), so "Siam Cemment Group" finds "Siam Cement PCL".
  const similar = await db.$queryRaw<{ id: string; nameEn: string; nameTh: string | null }[]>`
    SELECT id, "nameEn", "nameTh" FROM "Organisation"
    WHERE "archivedAt" IS NULL
      AND (${excludeId ?? null}::text IS NULL OR id <> ${excludeId ?? null})
      AND (similarity("nameKey", ${key}) >= 0.5
           OR (${thKey}::text IS NOT NULL AND similarity("nameThKey", ${thKey}) >= 0.5))
    ORDER BY greatest(similarity("nameKey", ${key}), similarity(coalesce("nameThKey", ''), coalesce(${thKey}, ''))) DESC
    LIMIT 5`;
  const seen = new Set<string>();
  return [...exact, ...similar]
    .filter((o) => (seen.has(o.id) ? false : (seen.add(o.id), true)))
    .slice(0, 5)
    .map((o) => ({ id: o.id, label: o.nameEn, sub: o.nameTh ?? undefined, href: `/organisations/${o.id}` }));
}

function toData(input: OrganisationInput) {
  return {
    nameEn: input.nameEn,
    nameTh: input.nameTh,
    nameKey: orgNameKey(input.nameEn),
    nameThKey: orgNameThKey(input.nameTh),
    type: input.type,
    status: input.status,
    industryId: input.industryId,
    country: input.country,
    relationshipPartnerId: input.relationshipPartnerId,
    isKeyClient: input.isKeyClient,
    website: input.website,
    notes: input.notes,
  } satisfies Prisma.OrganisationUncheckedUpdateInput;
}

const snapshot = <T extends { nameKey: string; nameThKey: string | null }>(o: T) => omit(o, ["nameKey", "nameThKey"]);

export async function createOrganisation(actor: Actor, input: OrganisationInput, ctx: AuditContext) {
  assertCan(actor, "create", "Organisation");
  if (!input.confirmDuplicate) {
    const dupes = await findOrganisationDuplicates(input.nameEn, input.nameTh);
    if (dupes.length) throw new DuplicateError(dupes);
  }
  return withAudit(ctx, async (tx) => {
    const org = await tx.organisation.create({ data: { ...toData(input), createdById: actor.id } });
    return {
      result: org,
      audit: [{ action: "CREATE", entity: "Organisation", entityId: org.id, after: snapshot(org) }],
    };
  });
}

export async function updateOrganisation(actor: Actor, id: string, input: OrganisationInput, ctx: AuditContext) {
  return withAudit(ctx, async (tx) => {
    const before = await tx.organisation.findUnique({ where: { id } });
    if (!before) throw new UserFacingError("Organisation not found.");
    assertCan(actor, "update", "Organisation", organisationFacts(before));
    // A partner may not hand the relationship to someone else and lose access by accident — allowed, but audited.
    const after = await tx.organisation.update({ where: { id }, data: toData(input) });
    return {
      result: after,
      audit: [
        { action: "UPDATE", entity: "Organisation", entityId: id, before: snapshot(before), after: snapshot(after) },
      ],
    };
  });
}

export async function setOrganisationArchived(actor: Actor, id: string, archived: boolean, ctx: AuditContext) {
  return withAudit(ctx, async (tx) => {
    const before = await tx.organisation.findUnique({ where: { id } });
    if (!before) throw new UserFacingError("Organisation not found.");
    assertCan(actor, "archive", "Organisation", organisationFacts(before));
    const after = await tx.organisation.update({ where: { id }, data: { archivedAt: archived ? new Date() : null } });
    return {
      result: after,
      audit: [{ action: archived ? "ARCHIVE" : "RESTORE", entity: "Organisation", entityId: id }],
    };
  });
}
