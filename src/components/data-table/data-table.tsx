"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useState } from "react";
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  type ColumnDef,
  type SortingState,
  useReactTable,
} from "@tanstack/react-table";
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export interface ServerPagination {
  page: number; // 1-based
  pageSize: number;
  total: number;
}

/**
 * Shared TanStack table.
 * - Client mode (default): sorting, quick filter and paging in the browser — for small lists.
 * - Server mode: pass `serverPagination`; paging links update ?page= and the server re-queries.
 */
export function DataTable<TData>({
  columns,
  data,
  serverPagination,
  quickFilterPlaceholder,
  emptyMessage = "No records yet.",
}: {
  columns: ColumnDef<TData, unknown>[];
  data: TData[];
  serverPagination?: ServerPagination;
  quickFilterPlaceholder?: string;
  emptyMessage?: string;
}) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = useState("");
  const server = !!serverPagination;

  // eslint-disable-next-line react-hooks/incompatible-library -- TanStack Table v8 is not React Compiler-aware
  const table = useReactTable({
    data,
    columns,
    state: { sorting, globalFilter },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    enableSorting: !server, // server lists are ordered by the query, not per page
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    ...(server ? { manualPagination: true } : { getPaginationRowModel: getPaginationRowModel() }),
    initialState: { pagination: { pageSize: 25 } },
  });

  return (
    <div className="flex flex-col gap-3">
      {quickFilterPlaceholder && !server && (
        <Input
          value={globalFilter}
          onChange={(e) => setGlobalFilter(e.target.value)}
          placeholder={quickFilterPlaceholder}
          aria-label="Filter"
          className="max-w-xs"
        />
      )}
      <div className="bg-card rounded-lg border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((hg) => (
              <TableRow key={hg.id} className="hover:bg-transparent">
                {hg.headers.map((header) => {
                  const sortable = header.column.getCanSort();
                  const dir = header.column.getIsSorted();
                  return (
                    <TableHead
                      key={header.id}
                      aria-sort={dir === "asc" ? "ascending" : dir === "desc" ? "descending" : undefined}
                    >
                      {header.isPlaceholder ? null : sortable ? (
                        <button
                          type="button"
                          onClick={header.column.getToggleSortingHandler()}
                          className="hover:text-foreground inline-flex items-center gap-1 uppercase"
                        >
                          {flexRender(header.column.columnDef.header, header.getContext())}
                          {dir === "asc" ? (
                            <ArrowUp className="size-3" />
                          ) : dir === "desc" ? (
                            <ArrowDown className="size-3" />
                          ) : (
                            <ArrowUpDown className="size-3 opacity-40" />
                          )}
                        </button>
                      ) : (
                        flexRender(header.column.columnDef.header, header.getContext())
                      )}
                    </TableHead>
                  );
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={columns.length} className="text-muted-foreground h-24 text-center">
                  {emptyMessage}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      {server ? <ServerPager {...serverPagination} /> : <ClientPager table={table} />}
    </div>
  );
}

function ClientPager<T>({ table }: { table: ReturnType<typeof useReactTable<T>> }) {
  if (table.getPageCount() <= 1) return null;
  return (
    <div className="flex items-center justify-end gap-2 text-sm">
      <span className="text-muted-foreground">
        Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount()}
      </span>
      <Button variant="outline" size="sm" onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()}>
        Previous
      </Button>
      <Button variant="outline" size="sm" onClick={() => table.nextPage()} disabled={!table.getCanNextPage()}>
        Next
      </Button>
    </div>
  );
}

function ServerPager({ page, pageSize, total }: ServerPagination) {
  const pathname = usePathname();
  const params = useSearchParams();
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const href = (p: number) => {
    const next = new URLSearchParams(params);
    next.set("page", String(p));
    return `${pathname}?${next.toString()}`;
  };
  return (
    <div className="flex items-center justify-between gap-2 text-sm">
      <span className="text-muted-foreground">
        {total.toLocaleString("en-GB")} records · page {page} of {pages}
      </span>
      <div className="flex gap-2">
        <Button variant="outline" size="sm" asChild disabled={page <= 1}>
          {page <= 1 ? <span aria-disabled>Previous</span> : <Link href={href(page - 1)}>Previous</Link>}
        </Button>
        <Button variant="outline" size="sm" asChild disabled={page >= pages}>
          {page >= pages ? <span aria-disabled>Next</span> : <Link href={href(page + 1)}>Next</Link>}
        </Button>
      </div>
    </div>
  );
}
