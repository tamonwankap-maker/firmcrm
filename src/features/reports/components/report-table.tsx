import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { formatCell, isNumeric } from "../format";
import type { ReportResult } from "../types";

export const MAX_ROWS_ON_SCREEN = 500;

export function ReportTable({ result }: { result: ReportResult }) {
  const rows = result.rows.slice(0, MAX_ROWS_ON_SCREEN);
  return (
    <div className="bg-card rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            {result.columns.map((c) => (
              <TableHead key={c.key} className={cn(isNumeric(c.type) && "text-right")}>
                {c.label}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.length === 0 && (
            <TableRow className="hover:bg-transparent">
              <TableCell colSpan={result.columns.length} className="text-muted-foreground h-20 text-center">
                No records for these filters.
              </TableCell>
            </TableRow>
          )}
          {rows.map((r, i) => (
            <TableRow key={i}>
              {result.columns.map((c) => (
                <TableCell
                  key={c.key}
                  className={cn(
                    "text-sm",
                    isNumeric(c.type) && "text-right tabular-nums",
                    c.type === "date" && "whitespace-nowrap",
                  )}
                >
                  {formatCell(r[c.key], c.type)}
                </TableCell>
              ))}
            </TableRow>
          ))}
          {result.totals && rows.length > 0 && (
            <TableRow className="border-t-2 font-semibold hover:bg-transparent">
              {result.columns.map((c) => (
                <TableCell key={c.key} className={cn(isNumeric(c.type) && "text-right tabular-nums")}>
                  {formatCell(result.totals?.[c.key] ?? null, c.type)}
                </TableCell>
              ))}
            </TableRow>
          )}
        </TableBody>
      </Table>
      {result.rows.length > MAX_ROWS_ON_SCREEN && (
        <p className="text-muted-foreground border-t px-3 py-2 text-xs">
          Showing the first {MAX_ROWS_ON_SCREEN} of {result.rows.length.toLocaleString("en-GB")} rows — export to Excel
          for the full list.
        </p>
      )}
    </div>
  );
}
