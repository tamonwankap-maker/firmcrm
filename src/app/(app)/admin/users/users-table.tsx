"use client";

import Link from "next/link";
import type { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/data-table/data-table";
import { Badge } from "@/components/ui/badge";
import { formatDateTime } from "@/lib/dates";
import { ROLE_LABELS } from "@/features/users/labels";
import type { Role } from "@/server/auth/policy";

export interface UserRow {
  id: string;
  name: string;
  email: string;
  role: Role;
  title: string;
  active: boolean;
  canLogin: boolean;
  lastLoginAt: string | null;
  practiceAreas: string[];
}

const columns: ColumnDef<UserRow, unknown>[] = [
  {
    accessorKey: "name",
    header: "Name",
    cell: ({ row }) => (
      <div>
        <Link href={`/admin/users/${row.original.id}`} className="font-medium hover:underline">
          {row.original.name}
        </Link>
        <div className="text-muted-foreground text-xs">{row.original.email}</div>
      </div>
    ),
  },
  { accessorKey: "title", header: "Title" },
  {
    accessorKey: "role",
    header: "Role",
    cell: ({ row }) => <Badge variant="secondary">{ROLE_LABELS[row.original.role]}</Badge>,
  },
  {
    id: "practiceAreas",
    header: "Practice areas",
    accessorFn: (r) => r.practiceAreas.join(", "),
    cell: ({ row }) => <span className="text-muted-foreground text-xs">{row.original.practiceAreas.join(", ")}</span>,
  },
  {
    id: "status",
    header: "Status",
    accessorFn: (r) => (r.active ? (r.canLogin ? "Active" : "No login") : "Inactive"),
    cell: ({ row }) =>
      !row.original.active ? (
        <Badge variant="destructive">Inactive</Badge>
      ) : row.original.canLogin ? (
        <Badge variant="success">Active</Badge>
      ) : (
        <Badge variant="outline">No login</Badge>
      ),
  },
  {
    accessorKey: "lastLoginAt",
    header: "Last sign-in",
    cell: ({ row }) => <span className="text-xs">{formatDateTime(row.original.lastLoginAt) || "—"}</span>,
  },
];

export function UsersTable({ rows }: { rows: UserRow[] }) {
  return <DataTable columns={columns} data={rows} quickFilterPlaceholder="Filter users…" />;
}
