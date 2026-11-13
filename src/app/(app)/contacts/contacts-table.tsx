"use client";

import Link from "next/link";
import type { ColumnDef } from "@tanstack/react-table";
import { DataTable, type ServerPagination } from "@/components/data-table/data-table";
import { Badge } from "@/components/ui/badge";

export interface ContactRow {
  id: string;
  nameEn: string;
  nameTh: string | null;
  title: string | null;
  email: string | null;
  phone: string | null;
  strength: number;
  organisation: { id: string; nameEn: string } | null;
  owners: string[];
  tags: string[];
}

function Strength({ n }: { n: number }) {
  return (
    <span className="inline-flex gap-0.5" aria-label={`Relationship strength ${n} of 5`} title={`${n} / 5`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <span key={i} className={i <= n ? "bg-primary size-2 rounded-full" : "bg-border size-2 rounded-full"} />
      ))}
    </span>
  );
}

const columns: ColumnDef<ContactRow, unknown>[] = [
  {
    id: "name",
    header: "Name",
    cell: ({ row: { original: c } }) => (
      <div>
        <Link href={`/contacts/${c.id}`} className="font-medium hover:underline">
          {c.nameEn}
        </Link>
        {c.nameTh && (
          <div className="text-muted-foreground text-xs" lang="th">
            {c.nameTh}
          </div>
        )}
      </div>
    ),
  },
  {
    id: "org",
    header: "Organisation / title",
    cell: ({ row: { original: c } }) => (
      <div className="text-sm">
        {c.organisation ? (
          <Link href={`/organisations/${c.organisation.id}`} className="hover:underline">
            {c.organisation.nameEn}
          </Link>
        ) : (
          "—"
        )}
        {c.title && <div className="text-muted-foreground text-xs">{c.title}</div>}
      </div>
    ),
  },
  {
    id: "contact",
    header: "Email / phone",
    cell: ({ row: { original: c } }) => (
      <div className="text-xs">
        {c.email && (
          <a href={`mailto:${c.email}`} className="hover:underline">
            {c.email}
          </a>
        )}
        {c.phone && <div className="text-muted-foreground">{c.phone}</div>}
      </div>
    ),
  },
  { id: "strength", header: "Strength", cell: ({ row }) => <Strength n={row.original.strength} /> },
  {
    id: "owners",
    header: "Owners",
    cell: ({ row }) => <span className="text-xs">{row.original.owners.join(", ")}</span>,
  },
  {
    id: "tags",
    header: "Tags",
    cell: ({ row }) => (
      <div className="flex flex-wrap gap-1">
        {row.original.tags.map((t) => (
          <Badge key={t} variant="outline">
            {t}
          </Badge>
        ))}
      </div>
    ),
  },
];

export function ContactsTable({ rows, pagination }: { rows: ContactRow[]; pagination: ServerPagination }) {
  return <DataTable columns={columns} data={rows} serverPagination={pagination} emptyMessage="No contacts match." />;
}
