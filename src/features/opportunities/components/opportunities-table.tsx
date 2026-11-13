"use client";

import Link from "next/link";
import { Lock } from "lucide-react";
import type { ColumnDef } from "@tanstack/react-table";
import { DataTable, type ServerPagination } from "@/components/data-table/data-table";
import type { ConflictKey, StageKey } from "../../labels";
import { CONFLICT_LABELS } from "../../labels";
import { StageBadge } from "./badges";

export interface OppTableRow {
  id: string;
  name: string;
  confidential: boolean;
  organisation: { id: string; nameEn: string };
  stage: StageKey;
  lead: string;
  practiceAreas: string;
  fee: string;
  probability: number;
  weighted: string;
  conflict: ConflictKey;
  expectedDecision: string;
}

const columns: ColumnDef<OppTableRow, unknown>[] = [
  {
    id: "name",
    header: "Opportunity",
    cell: ({ row: { original: o } }) => (
      <div>
        <Link href={`/opportunities/${o.id}`} className="font-medium hover:underline">
          {o.confidential && <Lock className="text-destructive mr-1 inline size-3" aria-label="Confidential" />}
          {o.name}
        </Link>
        <div className="text-xs">
          <Link href={`/organisations/${o.organisation.id}`} className="text-muted-foreground hover:underline">
            {o.organisation.nameEn}
          </Link>
        </div>
      </div>
    ),
  },
  { id: "stage", header: "Stage", cell: ({ row }) => <StageBadge stage={row.original.stage} /> },
  { id: "lead", header: "Lead partner", cell: ({ row }) => row.original.lead },
  {
    id: "practice",
    header: "Practice",
    cell: ({ row }) => <span className="text-xs">{row.original.practiceAreas}</span>,
  },
  {
    id: "fee",
    header: "Fee estimate",
    cell: ({ row }) => <span className="text-xs whitespace-nowrap">{row.original.fee || "—"}</span>,
  },
  {
    id: "weighted",
    header: "Weighted",
    cell: ({ row }) => (
      <span className="text-xs whitespace-nowrap tabular-nums">
        {row.original.weighted} <span className="text-muted-foreground">({row.original.probability}%)</span>
      </span>
    ),
  },
  {
    id: "conflict",
    header: "Conflict",
    cell: ({ row }) => (
      <span className={row.original.conflict === "CONFLICT" ? "text-destructive text-xs font-medium" : "text-xs"}>
        {CONFLICT_LABELS[row.original.conflict]}
      </span>
    ),
  },
  {
    id: "decision",
    header: "Decision",
    cell: ({ row }) => <span className="text-xs whitespace-nowrap">{row.original.expectedDecision || "—"}</span>,
  },
];

export function OpportunitiesTable({ rows, pagination }: { rows: OppTableRow[]; pagination: ServerPagination }) {
  return (
    <DataTable columns={columns} data={rows} serverPagination={pagination} emptyMessage="No opportunities match." />
  );
}
