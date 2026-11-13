/**
 * Import column definitions. Headers are matched case-insensitively against the aliases,
 * so files exported from Outlook / old spreadsheets usually work without renaming.
 */
export interface ColumnDef {
  key: string;
  header: string; // template header
  aliases: string[];
  required?: boolean;
  example: string;
  help: string;
}

export const ORG_COLUMNS: ColumnDef[] = [
  {
    key: "nameEn",
    header: "Name (EN)",
    aliases: ["name", "name en", "name_en", "nameen", "organisation", "organization", "company"],
    required: true,
    example: "Siam Example Co., Ltd.",
    help: "English name (required)",
  },
  {
    key: "nameTh",
    header: "Name (TH)",
    aliases: ["name th", "name_th", "nameth", "thai name", "ชื่อ", "ชื่อบริษัท"],
    example: "บริษัท สยามตัวอย่าง จำกัด",
    help: "Thai name",
  },
  {
    key: "type",
    header: "Type",
    aliases: ["organisation type", "organization type", "category"],
    required: true,
    example: "Client",
    help: "Client, Prospect, Referrer, Foreign law firm, Intermediary, Media, Directory, Association",
  },
  { key: "status", header: "Status", aliases: [], example: "Active", help: "Active, Dormant or Lost (default Active)" },
  {
    key: "industry",
    header: "Industry",
    aliases: ["sector"],
    example: "Energy & Utilities",
    help: "Must match an industry in Admin › Lists",
  },
  {
    key: "country",
    header: "Country",
    aliases: ["country code"],
    example: "TH",
    help: "ISO code (TH, JP…) or English name; default TH",
  },
  {
    key: "partner",
    header: "Relationship partner email",
    aliases: ["relationship partner", "partner", "partner email"],
    example: "partner@yourfirm.com",
    help: "Email of an existing user",
  },
  { key: "isKeyClient", header: "Key client", aliases: ["key", "key account"], example: "Yes", help: "Yes / No" },
  { key: "website", header: "Website", aliases: ["web", "url"], example: "www.example.co.th", help: "" },
  { key: "notes", header: "Notes", aliases: ["note", "comments"], example: "", help: "" },
];

export const CONTACT_COLUMNS: ColumnDef[] = [
  {
    key: "nameEn",
    header: "Name (EN)",
    aliases: ["name", "name en", "name_en", "full name", "contact"],
    required: true,
    example: "Somchai Jaidee",
    help: "English name (required)",
  },
  {
    key: "nameTh",
    header: "Name (TH)",
    aliases: ["name th", "name_th", "thai name", "ชื่อ", "ชื่อ-นามสกุล"],
    example: "สมชาย ใจดี",
    help: "Thai name",
  },
  { key: "title", header: "Job title", aliases: ["title", "position", "ตำแหน่ง"], example: "General Counsel", help: "" },
  {
    key: "organisation",
    header: "Organisation",
    aliases: ["organization", "company", "บริษัท"],
    example: "Siam Example Co., Ltd.",
    help: "Matched to existing organisations by name",
  },
  {
    key: "email",
    header: "Email",
    aliases: ["e-mail", "email address", "e-mail address"],
    example: "somchai@example.co.th",
    help: "",
  },
  {
    key: "phone",
    header: "Phone",
    aliases: ["mobile", "telephone", "tel", "เบอร์โทร"],
    example: "+66 81 234 5678",
    help: "",
  },
  { key: "linkedinUrl", header: "LinkedIn", aliases: ["linkedin url"], example: "", help: "" },
  {
    key: "owners",
    header: "Owner emails",
    aliases: ["owner", "owners", "owner email"],
    example: "partner@yourfirm.com",
    help: "Comma-separated user emails; default you",
  },
  {
    key: "relationshipStrength",
    header: "Relationship strength",
    aliases: ["strength"],
    example: "3",
    help: "1–5 (default 3)",
  },
  {
    key: "preferredLanguage",
    header: "Preferred language",
    aliases: ["language"],
    example: "TH",
    help: "EN, TH or Other",
  },
  { key: "tags", header: "Tags", aliases: ["tag", "categories"], example: "GC, Japan desk", help: "Comma-separated" },
  {
    key: "newsletter",
    header: "Newsletter consent",
    aliases: ["newsletter"],
    example: "Yes",
    help: "Yes only if the contact actually opted in (PDPA)",
  },
  {
    key: "clientAlerts",
    header: "Client alerts consent",
    aliases: ["client alerts"],
    example: "",
    help: "Yes / blank",
  },
  {
    key: "eventInvites",
    header: "Event invites consent",
    aliases: ["event invites", "events"],
    example: "",
    help: "Yes / blank",
  },
  { key: "consentDate", header: "Consent date", aliases: [], example: "2026-01-15", help: "YYYY-MM-DD; default today" },
  { key: "notes", header: "Notes", aliases: ["note", "comments"], example: "", help: "" },
];

const norm = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9ก-๙]+/g, " ")
    .trim();

/** Map file headers to column keys. Returns index per key and unrecognised headers. */
export function mapHeaders(headers: string[], cols: ColumnDef[]) {
  const index: Record<string, number> = {};
  const unknown: string[] = [];
  headers.forEach((h, i) => {
    const n = norm(h);
    const col = cols.find(
      (c) =>
        norm(c.header) === n || c.key.toLowerCase() === n.replace(/ /g, "") || c.aliases.some((a) => norm(a) === n),
    );
    if (col && index[col.key] === undefined) index[col.key] = i;
    else if (h) unknown.push(h);
  });
  const missing = cols.filter((c) => c.required && index[c.key] === undefined).map((c) => c.header);
  return { index, unknown, missing };
}

export function pick(row: string[], index: Record<string, number>, key: string): string {
  const i = index[key];
  return i === undefined ? "" : (row[i] ?? "").trim();
}

/** Yes/No-ish → boolean. */
export function truthy(v: string): boolean {
  return /^(y|yes|true|1|x|✓|ใช่)$/i.test(v.trim());
}
