import type { Metadata } from "next";
import Link from "next/link";
import { Lock } from "lucide-react";
import { requireUser } from "@/server/auth/current-user";
import { listPitches, pitchFilterSchema } from "@/features/pitches/queries";
import { checklistProgress } from "@/features/pitches/facts";
import { PITCH_FORMAT_LABELS, PITCH_STATUS_LABELS } from "@/features/labels";
import { PageHeader } from "@/components/layout/page-header";
import { FilterBar, FilterField } from "@/components/layout/filter-bar";
import { Pager } from "@/components/layout/pager";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDateTime } from "@/lib/dates";
import { DEFAULT_PAGE_SIZE } from "@/lib/list-params";

export const metadata: Metadata = { title: "Pitches" };

export default async function PitchesPage(props: PageProps<"/pitches">) {
  const me = await requireUser();
  const sp = await props.searchParams;
  const f = pitchFilterSchema.parse(sp);
  const { total, rows } = await listPitches(me, f);
  const now = new Date();
  return (
    <>
      <PageHeader
        title="Pitches"
        description="Proposals and presentations, soonest deadline first. Create a pitch from its opportunity."
      />
      <FilterBar resetHref="/pitches">
        <FilterField label="Search opportunity / client" htmlFor="q">
          <Input id="q" name="q" type="search" defaultValue={f.q} className="w-56" />
        </FilterField>
        <FilterField label="Status" htmlFor="status">
          <NativeSelect id="status" name="status" defaultValue={f.status}>
            <option value="open">Not yet submitted</option>
            <option value="submitted">Submitted</option>
            <option value="all">All</option>
          </NativeSelect>
        </FilterField>
        <label className="flex items-center gap-2 pb-2 text-sm">
          <Checkbox name="mine" value="1" defaultChecked={!!f.mine} /> Mine
        </label>
      </FilterBar>
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Deadline</TableHead>
                <TableHead>Opportunity</TableHead>
                <TableHead>Format</TableHead>
                <TableHead>Owner</TableHead>
                <TableHead>Checklist</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 && (
                <TableRow className="hover:bg-transparent">
                  <TableCell colSpan={6} className="text-muted-foreground h-20 text-center">
                    No pitches match.
                  </TableCell>
                </TableRow>
              )}
              {rows.map((p) => {
                const prog = checklistProgress(p.checklist);
                const overdue = p.status !== "SUBMITTED" && p.deadline < now;
                return (
                  <TableRow key={p.id}>
                    <TableCell className="whitespace-nowrap">
                      <Link href={`/pitches/${p.id}`} className="font-medium hover:underline">
                        {formatDateTime(p.deadline)}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <Link href={`/opportunities/${p.opportunity.id}`} className="hover:underline">
                        {p.opportunity.confidential && (
                          <Lock className="text-destructive mr-1 inline size-3" aria-label="Confidential" />
                        )}
                        {p.opportunity.name}
                      </Link>
                      <div className="text-muted-foreground text-xs">{p.opportunity.organisation.nameEn}</div>
                    </TableCell>
                    <TableCell className="text-xs">{PITCH_FORMAT_LABELS[p.format]}</TableCell>
                    <TableCell className="text-xs">{p.owner.name}</TableCell>
                    <TableCell className="text-xs tabular-nums">
                      {prog.done}/{prog.total}
                    </TableCell>
                    <TableCell>
                      <Badge variant={p.status === "SUBMITTED" ? "success" : overdue ? "destructive" : "secondary"}>
                        {overdue ? "Overdue" : PITCH_STATUS_LABELS[p.status]}
                      </Badge>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      <Pager page={f.page} pageSize={DEFAULT_PAGE_SIZE} total={total} params={sp} path="/pitches" />
    </>
  );
}
