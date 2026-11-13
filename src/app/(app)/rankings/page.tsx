import type { Metadata } from "next";
import Link from "next/link";
import { Plus } from "lucide-react";
import { requireUser } from "@/server/auth/current-user";
import { can } from "@/server/auth/policy";
import { listSubmissions, submissionFilterSchema, submissionYears } from "@/features/rankings/queries";
import { daysUntil } from "@/features/rankings/rules";
import { directoryOptions } from "@/features/lookups/directory-options";
import { practiceAreaOptions } from "@/features/lookups/options";
import { PRE_SUBMISSION_STATUSES, SUBMISSION_STATUSES, SUBMISSION_STATUS_LABELS } from "@/features/labels";
import { PageHeader } from "@/components/layout/page-header";
import { FilterBar, FilterField } from "@/components/layout/filter-bar";
import { Pager } from "@/components/layout/pager";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { NativeSelect } from "@/components/ui/native-select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDateOnly, todayInBangkok } from "@/lib/dates";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Rankings" };

export default async function RankingsPage(props: PageProps<"/rankings">) {
  const me = await requireUser();
  const sp = await props.searchParams;
  const f = submissionFilterSchema.parse(sp);
  const [{ total, rows }, years, directories, practices] = await Promise.all([
    listSubmissions(me, f),
    submissionYears(),
    directoryOptions(),
    practiceAreaOptions(),
  ]);
  const today = todayInBangkok();

  return (
    <>
      <PageHeader
        title="Rankings"
        description="Directory submissions (Legal 500, Chambers & Partners, IFLR1000…), referees and results."
        actions={
          can(me, "create", "DirectorySubmission") && (
            <Button asChild>
              <Link href="/rankings/submissions/new">
                <Plus /> New submission
              </Link>
            </Button>
          )
        }
      />
      <FilterBar resetHref="/rankings">
        <FilterField label="Guide year" htmlFor="year">
          <NativeSelect id="year" name="year" defaultValue={f.year ? String(f.year) : ""}>
            <option value="">All</option>
            {years.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </NativeSelect>
        </FilterField>
        <FilterField label="Directory" htmlFor="directory">
          <NativeSelect id="directory" name="directory" defaultValue={f.directory ?? ""}>
            <option value="">All</option>
            {directories.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </NativeSelect>
        </FilterField>
        <FilterField label="Practice area" htmlFor="practice">
          <NativeSelect id="practice" name="practice" defaultValue={f.practice ?? ""}>
            <option value="">All</option>
            {practices.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </NativeSelect>
        </FilterField>
        <FilterField label="Status" htmlFor="status">
          <NativeSelect id="status" name="status" defaultValue={f.status ?? ""}>
            <option value="">All</option>
            {SUBMISSION_STATUSES.map((s) => (
              <option key={s} value={s}>
                {SUBMISSION_STATUS_LABELS[s]}
              </option>
            ))}
          </NativeSelect>
        </FilterField>
        <div className="flex flex-col gap-1.5 pb-1 text-sm">
          <label className="flex items-center gap-2">
            <Checkbox name="mine" value="1" defaultChecked={!!f.mine} /> Mine
          </label>
          <label className="flex items-center gap-2">
            <Checkbox name="archived" value="1" defaultChecked={f.archived} /> Archived
          </label>
        </div>
      </FilterBar>
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Directory · year</TableHead>
                <TableHead>Practice area</TableHead>
                <TableHead>Deadline</TableHead>
                <TableHead>Owner / reviewer</TableHead>
                <TableHead>Referees</TableHead>
                <TableHead>Matters</TableHead>
                <TableHead>Status / result</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 && (
                <TableRow className="hover:bg-transparent">
                  <TableCell colSpan={7} className="text-muted-foreground h-20 text-center">
                    No submissions match.
                  </TableCell>
                </TableRow>
              )}
              {rows.map((s) => {
                const open = PRE_SUBMISSION_STATUSES.includes(s.status);
                const days = s.deadline ? daysUntil(s.deadline, today) : null;
                const urgent = open && days != null && days <= 14;
                return (
                  <TableRow key={s.id}>
                    <TableCell>
                      <Link href={`/rankings/submissions/${s.id}`} className="font-medium hover:underline">
                        {s.directory.name} {s.year}
                      </Link>
                    </TableCell>
                    <TableCell>{s.practiceArea.name}</TableCell>
                    <TableCell
                      className={cn(
                        "text-xs whitespace-nowrap",
                        urgent && "font-medium text-amber-700 dark:text-amber-300",
                        open && days != null && days < 0 && "text-destructive",
                      )}
                    >
                      {formatDateOnly(s.deadline) || "—"}
                      {open && days != null && (
                        <div>{days < 0 ? `${-days} days overdue` : days === 0 ? "today" : `in ${days} days`}</div>
                      )}
                    </TableCell>
                    <TableCell className="text-xs">
                      {s.owner.name}
                      {s.partnerReviewer && <div className="text-muted-foreground">{s.partnerReviewer.name}</div>}
                    </TableCell>
                    <TableCell className="text-xs tabular-nums">
                      {s.referees.length}{" "}
                      <span className="text-muted-foreground">
                        ({s.referees.filter((r) => r.briefed).length} briefed)
                      </span>
                    </TableCell>
                    <TableCell className="text-xs tabular-nums">{s._count.matters}</TableCell>
                    <TableCell>
                      <Badge variant={s.status === "RESULTS_PUBLISHED" ? "success" : open ? "secondary" : "outline"}>
                        {SUBMISSION_STATUS_LABELS[s.status]}
                      </Badge>
                      {s.resultTier && <div className="mt-1 text-xs font-medium">{s.resultTier}</div>}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      <Pager page={f.page} pageSize={50} total={total} params={sp} path="/rankings" />
    </>
  );
}
