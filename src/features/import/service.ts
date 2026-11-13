import "server-only";
import { db } from "@/server/db";
import { withAudit, type AuditContext, type AuditEntry } from "@/server/audit";
import { ForbiddenError, type Actor } from "@/server/auth/policy";
import { UserFacingError } from "@/server/actions/result";
import { todayInBangkok } from "@/lib/dates";
import { omit } from "@/lib/omit";
import { orgNameKey, orgNameThKey, personNameKey } from "../organisations/dedupe";
import { resolveTags } from "../contacts/service";
import { planContacts, planOrganisations, type ContactPlan, type OrgPlan, type RowIssue } from "./plan";
import { MAX_IMPORT_ROWS, type Sheet } from "./read-file";

export type ImportKind = "organisations" | "contacts";

/** Bulk import is a BD-team tool. */
export function assertCanImport(actor: Actor) {
  if (actor.role !== "ADMIN" && actor.role !== "BD") throw new ForbiddenError("Only the BD team can import data.");
}

export interface ImportSummary {
  kind: ImportKind;
  totalRows: number;
  toCreate: number;
  duplicates: RowIssue[];
  errors: RowIssue[];
  unknownHeaders: string[];
  missingHeaders: string[];
  newOrganisations: string[];
  consentRows: number;
  sample: { row: number; label: string; sub?: string }[];
}

async function usersByEmail() {
  const users = await db.user.findMany({ where: { active: true }, select: { id: true, email: true } });
  return new Map(users.map((u) => [u.email.toLowerCase(), u.id]));
}

export async function buildPlan(actor: Actor, kind: ImportKind, sheet: Sheet, createMissingOrganisations: boolean) {
  if (sheet.rows.length > MAX_IMPORT_ROWS)
    throw new UserFacingError(`Too many rows (${sheet.rows.length}). The limit is ${MAX_IMPORT_ROWS} per file.`);
  if (sheet.rows.length === 0) throw new UserFacingError("The file has no data rows.");

  if (kind === "organisations") {
    const [industries, users, orgs] = await Promise.all([
      db.industry.findMany({ select: { id: true, name: true } }),
      usersByEmail(),
      db.organisation.findMany({ where: { archivedAt: null }, select: { nameKey: true, nameThKey: true } }),
    ]);
    return planOrganisations(sheet.headers, sheet.rows, {
      industriesByName: new Map(industries.map((i) => [i.name.toLowerCase(), i.id])),
      usersByEmail: users,
      existingKeys: new Set(orgs.map((o) => o.nameKey)),
      existingThKeys: new Set(orgs.map((o) => o.nameThKey).filter((k): k is string => !!k)),
    });
  }
  const [users, orgs, contacts] = await Promise.all([
    usersByEmail(),
    db.organisation.findMany({ where: { archivedAt: null }, select: { id: true, nameKey: true } }),
    db.contact.findMany({ where: { archivedAt: null }, select: { email: true, nameKey: true, organisationId: true } }),
  ]);
  return planContacts(sheet.headers, sheet.rows, {
    orgIdsByKey: new Map(orgs.map((o) => [o.nameKey, o.id])),
    usersByEmail: users,
    existingEmails: new Set(contacts.map((c) => c.email?.toLowerCase()).filter((e): e is string => !!e)),
    existingNameOrg: new Set(contacts.map((c) => `${c.nameKey}|${c.organisationId ?? ""}`)),
    actorId: actor.id,
    todayYmd: todayInBangkok().toISOString().slice(0, 10),
    createMissingOrganisations,
  });
}

export function summarise(kind: ImportKind, plan: OrgPlan | ContactPlan): ImportSummary {
  return {
    kind,
    totalRows: plan.totalRows,
    toCreate: plan.creates.length,
    duplicates: plan.duplicates.slice(0, 200),
    errors: plan.errors.slice(0, 200),
    unknownHeaders: plan.unknownHeaders,
    missingHeaders: plan.missingHeaders,
    newOrganisations: "newOrganisations" in plan ? plan.newOrganisations : [],
    consentRows: "consentRows" in plan ? plan.consentRows : 0,
    sample: plan.creates.slice(0, 5).map((c) => ({
      row: c.row,
      label: c.input.nameEn,
      sub: c.input.nameTh ?? undefined,
    })),
  };
}

/** Create everything in one transaction, with an audit row per record plus a summary row. */
export async function commitPlan(
  actor: Actor,
  kind: ImportKind,
  plan: OrgPlan | ContactPlan,
  fileName: string,
  ctx: AuditContext,
): Promise<{ created: number; organisationsCreated: number }> {
  return withAudit(
    ctx,
    async (tx) => {
      const audit: AuditEntry[] = [];
      let organisationsCreated = 0;

      const createOrg = async (data: Parameters<typeof tx.organisation.create>[0]["data"]) => {
        const org = await tx.organisation.create({ data });
        audit.push({
          action: "CREATE",
          entity: "Organisation",
          entityId: org.id,
          after: omit(org, ["nameKey", "nameThKey"]),
        });
        organisationsCreated++;
        return org;
      };

      if (kind === "organisations") {
        for (const { input } of (plan as OrgPlan).creates) {
          const { confirmDuplicate: _c, ...rest } = input;
          await createOrg({
            ...rest,
            nameKey: orgNameKey(input.nameEn),
            nameThKey: orgNameThKey(input.nameTh),
            createdById: actor.id,
          });
        }
      } else {
        const cplan = plan as ContactPlan;
        // 1. organisations that did not exist yet
        const newOrgIds = new Map<string, string>();
        for (const name of cplan.newOrganisations) {
          const org = await createOrg({
            nameEn: name,
            nameKey: orgNameKey(name),
            type: "PROSPECT",
            createdById: actor.id,
          });
          newOrgIds.set(orgNameKey(name), org.id);
        }
        // 2. tags
        const allTags = [...new Set(cplan.creates.flatMap((c) => c.input.tags))];
        const tagIds = await resolveTags(tx, actor, allTags);
        const tagRows = await tx.tag.findMany({ where: { id: { in: tagIds } } });
        const tagId = new Map(tagRows.map((t) => [t.name.toLowerCase(), t.id]));
        // 3. contacts + consents
        for (const c of cplan.creates) {
          const i = c.input;
          const organisationId =
            i.organisationId ??
            (c.newOrganisationName ? newOrgIds.get(orgNameKey(c.newOrganisationName)) : null) ??
            null;
          const contact = await tx.contact.create({
            data: {
              nameEn: i.nameEn,
              nameTh: i.nameTh,
              nameKey: personNameKey(i.nameEn),
              title: i.title,
              organisationId,
              email: i.email,
              phone: i.phone,
              linkedinUrl: i.linkedinUrl,
              relationshipStrength: i.relationshipStrength,
              preferredLanguage: i.preferredLanguage,
              notes: i.notes,
              createdById: actor.id,
              owners: { connect: i.ownerIds.map((id) => ({ id })) },
              tags: { connect: i.tags.map((t) => ({ id: tagId.get(t.toLowerCase())! })) },
              consents: {
                create: c.consents.map((list) => ({
                  list,
                  optedIn: true,
                  consentDate: c.consentDate,
                  source: "IMPORT" as const,
                  evidenceNote: `Imported from ${fileName}`,
                })),
              },
            },
          });
          audit.push({
            action: "CREATE",
            entity: "Contact",
            entityId: contact.id,
            after: { ...omit(contact, ["nameKey"]), ownerIds: i.ownerIds, tags: i.tags, consents: c.consents },
          });
        }
      }
      audit.push({
        action: "CREATE",
        entity: "Import",
        meta: {
          kind,
          fileName,
          created: plan.creates.length,
          organisationsCreated,
          skippedDuplicates: plan.duplicates.length,
          errors: plan.errors.length,
        },
      });
      return { result: { created: plan.creates.length, organisationsCreated }, audit };
    },
    { timeout: 300_000, maxWait: 10_000 },
  );
}
