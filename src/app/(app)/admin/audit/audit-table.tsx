"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { DataTable, type ServerPagination } from "@/components/data-table/data-table";
import { Badge } from "@/components/ui/badge";
import { formatDateTime } from "@/lib/dates";

export interface AuditRow {
  id: string;
  createdAt: string;
  user: string;
  action: string;
  entity: string;
  entityId: string | null;
  ip: string | null;
  diff: string | null;
}

const ACTION_VARIANT: Record<string, "success" | "warning" | "destructive" | "secondary" | "outline"> = {
  CREATE: "success",
  UPDATE: "secondary",
  DELETE: "destructive",
  ARCHIVE: "warning",
  LOGIN_FAILED: "destructive",
  EXPORT: "warning",
  PASSWORD_RESET: "warning",
};

const columns: ColumnDef<AuditRow, unknown>[] = [
  {
    accessorKey: "createdAt",
    header: "When (Bangkok)",
    enableSorting: false,
    cell: ({ row }) => <span className="text-xs whitespace-nowrap">{formatDateTime(row.original.createdAt)}</span>,
  },
  { accessorKey: "user", header: "User", enableSorting: false },
  {
    accessorKey: "action",
    header: "Action",
    enableSorting: false,
    cell: ({ row }) => <Badge variant={ACTION_VARIANT[row.original.action] ?? "outline"}>{row.original.action}</Badge>,
  },
  {
    accessorKey: "entity",
    header: "Record",
    enableSorting: false,
    cell: ({ row }) => (
      <div>
        <div>{row.original.entity}</div>
        <div className="text-muted-foreground font-mono text-[11px]">{row.original.entityId}</div>
      </div>
    ),
  },
  {
    accessorKey: "diff",
    header: "Changes",
    enableSorting: false,
    cell: ({ row }) =>
      row.original.diff ? (
        <details>
          <summary className="text-primary cursor-pointer text-xs">View</summary>
          <pre className="bg-muted mt-2 max-h-80 max-w-xl overflow-auto rounded p-2 text-[11px]">
            {row.original.diff}
          </pre>
        </details>
      ) : (
        <span className="text-muted-foreground text-xs">—</span>
      ),
  },
  {
    accessorKey: "ip",
    header: "IP",
    enableSorting: false,
    cell: ({ row }) => <span className="font-mono text-xs">{row.original.ip ?? ""}</span>,
  },
];

export function AuditTable({ rows, pagination }: { rows: AuditRow[]; pagination: ServerPagination }) {
  return (
    <DataTable
      columns={columns}
      data={rows}
      serverPagination={pagination}
      emptyMessage="No audit entries match these filters."
    />
  );
}
