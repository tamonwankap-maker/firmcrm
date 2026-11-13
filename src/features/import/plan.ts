/**
 * Import planning (pure; unit-tested): turn spreadsheet rows into validated create-inputs,
 * flagging duplicates (against the database and earlier rows) and row errors. No DB access here.
 */
import { z } from "zod";
import { resolveCountry } from "@/lib/countries";
import { parseDateOnly } from "@/lib/dates";
import { normalizeText } from "@/lib/thai";
import { organisationInputSchema, type OrganisationInput } from "../organisations/schema";
import { contactInputSchema, type ContactInput } from "../contacts/schema";
import { orgNameKey, orgNameThKey, personNameKey } from "../organisations/dedupe";
import { ORG_STATUSES, ORG_STATUS_LABELS, ORG_TYPES, ORG_TYPE_LABELS, type MailingListKey } from "../labels";
import { CONTACT_COLUMNS, ORG_COLUMNS, mapHeaders, pick, truthy } from "./columns";

export interface RowIssue {
  row: number; // spreadsheet row number (header = 1)
  label: string;
  message: string;
}

export interface PlanBase {
  totalRows: number;
  unknownHeaders: string[];
  missingHeaders: string[];
  duplicates: RowIssue[];
  errors: RowIssue[];
}

function enumFrom<T extends string>(value: string, values: readonly T[], labels: Record<T, string>): T | undefined {
  const v = value
    .trim()
    .toLowerCase()
    .replace(/[\s_-]+/g, " ");
  if (!v) return undefined;
  return values.find((k) => k.toLowerCase().replace(/_/g, " ") === v || labels[k].toLowerCase() === v);
}

function firstIssue(err: z.ZodError): string {
  const i = err.issues[0];
  return `${i.path.join(".") || "row"}: ${i.message}`;
}

// ── Organisations ─────────────────────────────────────────────────────────

export interface OrgPlanContext {
  industriesByName: Map<string, string>; // lower-case name → id
  usersByEmail: Map<string, string>; // lower-case email → id
  existingKeys: Set<string>; // nameKey of existing organisations
  existingThKeys: Set<string>;
}

export interface OrgPlan extends PlanBase {
  creates: { row: number; input: OrganisationInput }[];
}

export function planOrganisations(headers: string[], rows: string[][], ctx: OrgPlanContext): OrgPlan {
  const { index, unknown, missing } = mapHeaders(headers, ORG_COLUMNS);
  const plan: OrgPlan = {
    totalRows: rows.length,
    unknownHeaders: unknown,
    missingHeaders: missing,
    duplicates: [],
    errors: [],
    creates: [],
  };
  if (missing.length) return plan;
  const seenKeys = new Set(ctx.existingKeys);
  const seenTh = new Set(ctx.existingThKeys);

  rows.forEach((r, i) => {
    const rowNo = i + 2;
    const get = (k: string) => pick(r, index, k);
    const label = get("nameEn") || `(row ${rowNo})`;
    const err = (message: string) => plan.errors.push({ row: rowNo, label, message });

    const type = enumFrom(get("type"), ORG_TYPES, ORG_TYPE_LABELS);
    if (!type) return err(`Unknown type “${get("type")}”`);
    const statusRaw = get("status");
    const status = statusRaw ? enumFrom(statusRaw, ORG_STATUSES, ORG_STATUS_LABELS) : "ACTIVE";
    if (!status) return err(`Unknown status “${statusRaw}”`);
    const industryRaw = get("industry");
    const industryId = industryRaw ? ctx.industriesByName.get(industryRaw.toLowerCase()) : null;
    if (industryRaw && !industryId) return err(`Unknown industry “${industryRaw}” — add it in Admin › Lists first`);
    const countryRaw = get("country");
    const country = countryRaw ? resolveCountry(countryRaw) : "TH";
    if (!country) return err(`Unknown country “${countryRaw}”`);
    const partnerRaw = get("partner").toLowerCase();
    const partnerId = partnerRaw ? ctx.usersByEmail.get(partnerRaw) : null;
    if (partnerRaw && !partnerId) return err(`No user with email ${partnerRaw}`);

    const parsed = organisationInputSchema.safeParse({
      nameEn: get("nameEn"),
      nameTh: get("nameTh"),
      type,
      status,
      industryId: industryId ?? "",
      country,
      relationshipPartnerId: partnerId ?? "",
      isKeyClient: truthy(get("isKeyClient")),
      website: get("website"),
      notes: get("notes"),
    });
    if (!parsed.success) return err(firstIssue(parsed.error));

    const key = orgNameKey(parsed.data.nameEn);
    const thKey = orgNameThKey(parsed.data.nameTh);
    if (seenKeys.has(key) || (thKey && seenTh.has(thKey))) {
      plan.duplicates.push({
        row: rowNo,
        label,
        message:
          ctx.existingKeys.has(key) || (thKey && ctx.existingThKeys.has(thKey))
            ? "Already in the CRM"
            : "Repeated in this file",
      });
      return;
    }
    seenKeys.add(key);
    if (thKey) seenTh.add(thKey);
    plan.creates.push({ row: rowNo, input: parsed.data });
  });
  return plan;
}

// ── Contacts ──────────────────────────────────────────────────────────────

export interface ContactPlanContext {
  orgIdsByKey: Map<string, string>; // orgNameKey → id
  usersByEmail: Map<string, string>;
  existingEmails: Set<string>; // lower-case
  existingNameOrg: Set<string>; // `${personNameKey}|${orgId ?? ""}`
  actorId: string;
  todayYmd: string;
  createMissingOrganisations: boolean;
}

export interface ContactCreate {
  row: number;
  input: ContactInput;
  /** Organisation to create first (when not found and creation is allowed). */
  newOrganisationName: string | null;
  consents: MailingListKey[];
  consentDate: Date;
}

export interface ContactPlan extends PlanBase {
  creates: ContactCreate[];
  newOrganisations: string[];
  consentRows: number;
}

export function planContacts(headers: string[], rows: string[][], ctx: ContactPlanContext): ContactPlan {
  const { index, unknown, missing } = mapHeaders(headers, CONTACT_COLUMNS);
  const plan: ContactPlan = {
    totalRows: rows.length,
    unknownHeaders: unknown,
    missingHeaders: missing,
    duplicates: [],
    errors: [],
    creates: [],
    newOrganisations: [],
    consentRows: 0,
  };
  if (missing.length) return plan;
  const emails = new Set(ctx.existingEmails);
  const nameOrg = new Set(ctx.existingNameOrg);
  const newOrgKeys = new Map<string, string>(); // key → display name

  rows.forEach((r, i) => {
    const rowNo = i + 2;
    const get = (k: string) => pick(r, index, k);
    const label = get("nameEn") || `(row ${rowNo})`;
    const err = (message: string) => plan.errors.push({ row: rowNo, label, message });

    // Organisation
    const orgName = normalizeText(get("organisation"));
    let organisationId: string | null = null;
    let newOrganisationName: string | null = null;
    let orgRef = "";
    if (orgName) {
      const key = orgNameKey(orgName);
      organisationId = ctx.orgIdsByKey.get(key) ?? null;
      orgRef = organisationId ?? `new:${key}`;
      if (!organisationId) {
        if (!ctx.createMissingOrganisations) return err(`Organisation “${orgName}” not found`);
        newOrganisationName = newOrgKeys.get(key) ?? orgName;
        newOrgKeys.set(key, newOrganisationName);
      }
    }

    // Owners
    const ownerEmails = get("owners")
      .split(/[,;\s]+/)
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean);
    const ownerIds: string[] = [];
    for (const e of ownerEmails) {
      const id = ctx.usersByEmail.get(e);
      if (!id) return err(`No user with email ${e}`);
      ownerIds.push(id);
    }

    const lang = get("preferredLanguage").toUpperCase();
    const parsed = contactInputSchema.safeParse({
      nameEn: get("nameEn"),
      nameTh: get("nameTh"),
      title: get("title"),
      organisationId: organisationId ?? "",
      email: get("email"),
      phone: get("phone"),
      linkedinUrl: get("linkedinUrl"),
      ownerIds: ownerIds.length ? ownerIds : [ctx.actorId],
      relationshipStrength: get("relationshipStrength") || "3",
      preferredLanguage: lang === "THAI" ? "TH" : lang === "ENGLISH" ? "EN" : lang || "EN",
      tags: get("tags"),
      notes: get("notes"),
    });
    if (!parsed.success) return err(firstIssue(parsed.error));

    const consentDateRaw = get("consentDate");
    const consentDate = parseDateOnly(consentDateRaw || ctx.todayYmd);
    if (!consentDate) return err(`Consent date must be YYYY-MM-DD (got “${consentDateRaw}”)`);

    // Duplicates
    const email = parsed.data.email?.toLowerCase();
    const nk = `${personNameKey(parsed.data.nameEn)}|${orgRef}`;
    if ((email && emails.has(email)) || nameOrg.has(nk)) {
      const inDb = (email && ctx.existingEmails.has(email)) || ctx.existingNameOrg.has(nk);
      plan.duplicates.push({ row: rowNo, label, message: inDb ? "Already in the CRM" : "Repeated in this file" });
      return;
    }
    if (email) emails.add(email);
    nameOrg.add(nk);

    const consents: MailingListKey[] = [];
    if (truthy(get("newsletter"))) consents.push("NEWSLETTER");
    if (truthy(get("clientAlerts"))) consents.push("CLIENT_ALERTS");
    if (truthy(get("eventInvites"))) consents.push("EVENT_INVITES");
    if (consents.length) plan.consentRows++;

    plan.creates.push({ row: rowNo, input: parsed.data, newOrganisationName, consents, consentDate });
  });
  plan.newOrganisations = [...newOrgKeys.values()];
  return plan;
}
