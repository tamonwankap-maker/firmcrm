"use client";

import Link from "next/link";
import { Star } from "lucide-react";
import type { ColumnDef } from "@tanstack/react-table";
import { DataTable, type ServerPagination } from "@/components/data-table/data-table";
import { Badge } from "@/components/ui/badge";
import { formatDateOnly } from "@/lib/dates";
import { ORG_STATUS_LABELS, ORG_TYPE_LABELS, type OrgStatus, type OrgType } from "@/features/labels";

export interface OrgRow {
  id: string;
  nameEn: string;
  nameTh: string | null;
  type: OrgType;
  status: OrgStatus;
  isKeyClient: boolean;
  country: string;
  industry: string | null;
  partner: string | null;
  contacts: number;
  lastActivity: string | null;
}

const STATUS_VARIANT = { ACTIVE: "success", DORMANT: "warning", LOST: "destructive" } as const;

const columns: ColumnDef<OrgRow, unknown>[] = [
  {
    id: "name",
    header: "Organisation",
    cell: ({ row: { original: o } }) => (
      <div className="flex items-start gap-1.5">
        {o.isKeyClient && (
          <Star className="fill-brand-gold text-brand-gold mt-0.5 size-3.5 shrink-0" aria-label="Key client" />
        )}
        <div>
          <Link href={`/organisations/${o.id}`} className="font-medium hover:underline">
            {o.nameEn}
          </Link>
          {o.nameTh && (
            <div className="text-muted-foreground text-xs" lang="th">
              {o.nameTh}
            </div>
          )}
        </div>
      </div>
    ),
  },
  { id: "type", header: "Type", cell: ({ row }) => ORG_TYPE_LABELS[row.original.type] },
  { id: "industry", header: "Industry", cell: ({ row }) => row.original.industry ?? "—" },
  { id: "country", header: "Country", cell: ({ row }) => row.original.country },
  { id: "partner", header: "Rel. partner", cell: ({ row }) => row.original.partner ?? "—" },
  {
    id: "contacts",
    header: "Contacts",
    cell: ({ row }) => <span className="tabular-nums">{row.original.contacts}</span>,
  },
  {
    id: "lastActivity",
    header: "Last activity",
    cell: ({ row }) => (
      <span className="text-xs whitespace-nowrap">{formatDateOnly(row.original.lastActivity) || "—"}</span>
    ),
  },
  {
    id: "status",
    header: "Status",
    cell: ({ row }) => (
      <Badge variant={STATUS_VARIANT[row.original.status]}>{ORG_STATUS_LABELS[row.original.status]}</Badge>
    ),
  },
];

export function OrganisationsTable({ rows, pagination }: { rows: OrgRow[]; pagination: ServerPagination }) {
  return (
    <DataTable columns={columns} data={rows} serverPagination={pagination} emptyMessage="No organisations match." />
  );
}
