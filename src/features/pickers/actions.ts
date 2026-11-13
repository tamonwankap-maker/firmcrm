"use server";

import { z } from "zod";
import { requireUser } from "@/server/auth/current-user";
import { db } from "@/server/db";
import { textSearchWhere } from "@/server/text-search";
import { matterVisibleWhere, opportunityVisibleWhere } from "@/server/auth/visibility";

export interface PickerOption {
  id: string;
  label: string;
  sub?: string;
}

const schema = z.object({
  kind: z.enum(["user", "lawyer", "organisation", "contact", "opportunity", "matter"]),
  q: z.string().max(100),
  organisationId: z.string().max(40).optional(),
});

/**
 * Type-ahead search for pickers. Organisations and contacts carry no confidential data,
 * so any signed-in user may search them (VIEWERs can read them anyway).
 */
export async function searchPickerAction(input: z.input<typeof schema>): Promise<PickerOption[]> {
  const me = await requireUser();
  const { kind, q, organisationId } = schema.parse(input);
  const take = 20;

  switch (kind) {
    case "user":
    case "lawyer": {
      // "user" = people who can log in (owners, attendees); "lawyer" = anyone at the firm.
      const rows = await db.user.findMany({
        where: {
          active: true,
          ...(kind === "user" ? { canLogin: true } : {}),
          ...textSearchWhere(["name", "email"], q),
        },
        orderBy: { name: "asc" },
        take,
        select: { id: true, name: true, title: true },
      });
      return rows.map((u) => ({ id: u.id, label: u.name, sub: u.title ?? undefined }));
    }
    case "organisation": {
      const rows = await db.organisation.findMany({
        where: { archivedAt: null, ...textSearchWhere(["nameEn", "nameTh"], q) },
        orderBy: { nameEn: "asc" },
        take,
        select: { id: true, nameEn: true, nameTh: true },
      });
      return rows.map((o) => ({ id: o.id, label: o.nameEn, sub: o.nameTh ?? undefined }));
    }
    case "opportunity": {
      // Respects confidentiality: only opportunities this user may see.
      const rows = await db.opportunity.findMany({
        where: {
          AND: [
            opportunityVisibleWhere(me),
            organisationId ? { organisationId } : {},
            q ? { OR: [textSearchWhere(["name"], q), { organisation: textSearchWhere(["nameEn", "nameTh"], q) }] } : {},
          ],
        },
        orderBy: { updatedAt: "desc" },
        take,
        select: { id: true, name: true, organisation: { select: { nameEn: true } } },
      });
      return rows.map((o) => ({ id: o.id, label: o.name, sub: o.organisation.nameEn }));
    }
    case "matter": {
      const rows = await db.representativeMatter.findMany({
        where: { AND: [matterVisibleWhere(me), textSearchWhere(["title", "clientDisplayName"], q)] },
        orderBy: [{ year: "desc" }, { title: "asc" }],
        take,
        select: {
          id: true,
          title: true,
          year: true,
          confidential: true,
          clientDisplayName: true,
          anonymised: true,
          clientOrganisation: { select: { nameEn: true } },
        },
      });
      return rows.map((m) => ({
        id: m.id,
        label: m.title,
        sub: [
          m.year,
          m.anonymised ? m.clientDisplayName : m.clientOrganisation?.nameEn,
          m.confidential ? "Confidential" : null,
        ]
          .filter(Boolean)
          .join(" · "),
      }));
    }
    case "contact": {
      const rows = await db.contact.findMany({
        where: {
          archivedAt: null,
          ...(organisationId ? { organisationId } : {}),
          ...textSearchWhere(["nameEn", "nameTh", "email"], q),
        },
        orderBy: { nameEn: "asc" },
        take,
        select: { id: true, nameEn: true, nameTh: true, organisation: { select: { nameEn: true } } },
      });
      return rows.map((c) => ({
        id: c.id,
        label: c.nameTh ? `${c.nameEn} (${c.nameTh})` : c.nameEn,
        sub: c.organisation?.nameEn,
      }));
    }
  }
}
