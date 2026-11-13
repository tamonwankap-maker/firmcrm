import type { Metadata } from "next";
import Link from "next/link";
import { requireUser } from "@/server/auth/current-user";
import { can } from "@/server/auth/policy";
import { awardFilterSchema, listAwards } from "@/features/awards/queries";
import { createAwardAction } from "@/features/awards/actions";
import { AwardForm } from "@/features/awards/components/award-form";
import { practiceAreaOptions } from "@/features/lookups/options";
import { AWARD_STATUSES, AWARD_STATUS_LABELS } from "@/features/labels";
import { PageHeader } from "@/components/layout/page-header";
import { FilterBar, FilterField } from "@/components/layout/filter-bar";
import { Pager } from "@/components/layout/pager";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDateOnly, todayInBangkok } from "@/lib/dates";

export const metadata: Metadata = { title: "Awards" };

const STATUS_VARIANT = { ENTERED: "secondary", SHORTLISTED: "warning", WON: "success", NOT_WON: "outline" } as const;

export default async function AwardsPage(props: PageProps<"/awards">) {
  const me = await requireUser();
  const sp = await props.searchParams;
  const f = awardFilterSchema.parse(sp);
  const [{ total, rows }, practiceAreas] = await Promise.all([listAwards(f), practiceAreaOptions()]);
  return (
    <>
      <PageHeader title="Awards" description="Award entries, shortlists and wins." />
      <FilterBar resetHref="/awards">
        <FilterField label="Search award / category" htmlFor="filter-q">
          <Input id="filter-q" name="q" type="search" defaultValue={f.q} className="w-56" />
        </FilterField>
        <FilterField label="Year" htmlFor="filter-year">
          <Input id="filter-year" name="year" type="number" defaultValue={f.year} className="w-28" />
        </FilterField>
        <FilterField label="Status" htmlFor="filter-status">
          <NativeSelect id="filter-status" name="status" defaultValue={f.status ?? ""}>
            <option value="">All</option>
            {AWARD_STATUSES.map((s) => (
              <option key={s} value={s}>
                {AWARD_STATUS_LABELS[s]}
              </option>
            ))}
          </NativeSelect>
        </FilterField>
      </FilterBar>
      <Card className="mb-6">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Award · category</TableHead>
                <TableHead>Year</TableHead>
                <TableHead>Deadline</TableHead>
                <TableHead>Practice</TableHead>
                <TableHead>Owner</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 && (
                <TableRow className="hover:bg-transparent">
                  <TableCell colSpan={6} className="text-muted-foreground h-20 text-center">
                    No award entries yet.
                  </TableCell>
                </TableRow>
              )}
              {rows.map((a) => (
                <TableRow key={a.id}>
                  <TableCell>
                    <Link href={`/awards/${a.id}`} className="font-medium hover:underline">
                      {a.name}
                    </Link>
                    <div className="text-muted-foreground text-xs">
                      {a.category}
                      {a.organiser && ` · ${a.organiser}`}
                    </div>
                  </TableCell>
                  <TableCell className="tabular-nums">{a.year}</TableCell>
                  <TableCell className="text-xs whitespace-nowrap">{formatDateOnly(a.deadline) || "—"}</TableCell>
                  <TableCell className="text-xs">{a.practiceAreas.map((p) => p.name).join(", ")}</TableCell>
                  <TableCell className="text-xs">{a.owner?.name ?? "—"}</TableCell>
                  <TableCell>
                    <Badge variant={STATUS_VARIANT[a.status]}>{AWARD_STATUS_LABELS[a.status]}</Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      <Pager page={f.page} pageSize={50} total={total} params={sp} path="/awards" />
      {can(me, "create", "Award") && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Add an award entry</CardTitle>
          </CardHeader>
          <CardContent>
            <AwardForm
              action={createAwardAction}
              practiceAreas={practiceAreas}
              submitLabel="Add entry"
              resetOnSuccess
              defaults={{
                name: "",
                organiser: "",
                category: "",
                year: String(todayInBangkok().getUTCFullYear()),
                deadline: "",
                owner: { id: me.id, label: me.name },
                practiceAreaIds: [],
                status: "ENTERED",
                notes: "",
              }}
            />
          </CardContent>
        </Card>
      )}
    </>
  );
}
