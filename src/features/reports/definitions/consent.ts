import "server-only";
import { db } from "@/server/db";
import { CONSENT_SOURCE_LABELS, LANGUAGE_LABELS, MAILING_LIST_LABELS } from "../../labels";
import type { ReportDef } from "../types";

/** PDPA: everyone currently opted in to a mailing list. The only list that should be used for mailings. */
export const consentReport: ReportDef = {
  id: "consent",
  title: "Mailing list (PDPA consent)",
  description:
    "Contacts currently opted in to a mailing list, with consent date and source — use this list for mailings.",
  roles: ["ADMIN", "BD"],
  params: ["list"],
  async run(_actor, p) {
    const consents = await db.mailingConsent.findMany({
      where: { list: p.list, optedIn: true, contact: { archivedAt: null } },
      orderBy: { contact: { nameEn: "asc" } },
      include: {
        contact: {
          select: {
            nameEn: true,
            nameTh: true,
            email: true,
            title: true,
            preferredLanguage: true,
            organisation: { select: { nameEn: true } },
          },
        },
      },
    });
    const rows = consents.map((c) => ({
      nameEn: c.contact.nameEn,
      nameTh: c.contact.nameTh,
      email: c.contact.email,
      title: c.contact.title,
      organisation: c.contact.organisation?.nameEn ?? null,
      language: LANGUAGE_LABELS[c.contact.preferredLanguage],
      consentDate: c.consentDate.toISOString(),
      source: CONSENT_SOURCE_LABELS[c.source],
    }));
    const noEmail = rows.filter((r) => !r.email).length;
    return {
      columns: [
        { key: "nameEn", label: "Name", type: "text" },
        { key: "nameTh", label: "ชื่อ (Thai)", type: "text" },
        { key: "email", label: "Email", type: "text" },
        { key: "title", label: "Title", type: "text" },
        { key: "organisation", label: "Organisation", type: "text" },
        { key: "language", label: "Language", type: "text" },
        { key: "consentDate", label: "Consent date", type: "date" },
        { key: "source", label: "Source", type: "text" },
      ],
      rows,
      highlights: [
        { label: "Opted in", value: String(rows.length) },
        { label: "Without email", value: String(noEmail) },
      ],
      notes: [
        `Only contacts with an active opt-in to “${MAILING_LIST_LABELS[p.list]}”. Withdrawn and never-recorded contacts are excluded.`,
        "Personal data — handle under the firm’s PDPA policy. This export is recorded in the audit log.",
      ],
    };
  },
};
