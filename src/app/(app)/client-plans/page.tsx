import type { Metadata } from "next";
import Link from "next/link";
import { Plus, Star } from "lucide-react";
import { requireUser } from "@/server/auth/current-user";
import { can } from "@/server/auth/policy";
import { listClientPlans, planFilterSchema } from "@/features/client-plans/queries";
import { HEALTH_LABELS } from "@/features/labels";
import { PageHeader } from "@/components/layout/page-header";
import { FilterBar, FilterField } from "@/components/layout/filter-bar";
import { Pager } from "@/components/layout/pager";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDateOnly } from "@/lib/dates";
import { HealthPill } from "@/features/client-plans/components/health-pill";

export const metadata: Metadata = { title: "Client plans" };

export default async function ClientPlansPage(props: PageProps<"/client-plans">) {
  const me = await requireUser();
  const sp = await props.searchParams;
  const f = planFilterSchema.parse(sp);
  const { total, rows } = await listClientPlans(me, f);
  return (
    <>
      <PageHeader
        title="Client plans"
        description="Annual key-client plans: objectives, cross-sell targets, review meetings and relationship health. Lowest health first."
        actions={
          can(me, "create", "ClientPlan") && (
            <Button asChild>
              <Link href="/client-plans/new">
                <Plus /> New plan
              </Link>
            </Button>
          )
        }
      />
      <FilterBar resetHref="/client-plans">
        <FilterField label="Search client" htmlFor="filter-q">
          <Input id="filter-q" name="q" type="search" defaultValue={f.q} className="w-52" />
        </FilterField>
        <FilterField label="Year" htmlFor="filter-year">
          <Input id="filter-year" name="year" type="number" defaultValue={f.year} className="w-28" />
        </FilterField>
        <FilterField label="Health at most" htmlFor="filter-health">
          <NativeSelect id="filter-health" name="health" defaultValue={f.health ? String(f.health) : ""}>
            <option value="">Any</option>
            {[1, 2, 3, 4].map((n) => (
              <option key={n} value={n}>
                {HEALTH_LABELS[n]}
              </option>
            ))}
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
                <TableHead>Client</TableHead>
                <TableHead>Year</TableHead>
                <TableHead>Health</TableHead>
                <TableHead>Cross-sell targets</TableHead>
                <TableHead>Next review</TableHead>
                <TableHead>Owner / rel. partner</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 && (
                <TableRow className="hover:bg-transparent">
                  <TableCell colSpan={6} className="text-muted-foreground h-20 text-center">
                    No client plans yet.
                  </TableCell>
                </TableRow>
              )}
              {rows.map((p) => (
                <TableRow key={p.id}>
                  <TableCell>
                    <Link href={`/client-plans/${p.id}`} className="font-medium hover:underline">
                      {p.organisation.isKeyClient && (
                        <Star className="fill-brand-gold text-brand-gold mr-1 inline size-3" aria-label="Key client" />
                      )}
                      {p.organisation.nameEn}
                    </Link>
                    {p.organisation.nameTh && (
                      <div className="text-muted-foreground text-xs" lang="th">
                        {p.organisation.nameTh}
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="tabular-nums">{p.year}</TableCell>
                  <TableCell>
                    <HealthPill score={p.healthScore} />
                  </TableCell>
                  <TableCell className="text-xs">{p.crossSellTargets.map((t) => t.name).join(", ") || "—"}</TableCell>
                  <TableCell className="text-xs whitespace-nowrap">
                    {formatDateOnly(p.reviewMeetingDate) || "—"}
                  </TableCell>
                  <TableCell className="text-xs">
                    {p.owner?.name ?? "—"}
                    {p.organisation.relationshipPartner && (
                      <div className="text-muted-foreground">{p.organisation.relationshipPartner.name}</div>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      <Pager page={f.page} pageSize={50} total={total} params={sp} path="/client-plans" />
    </>
  );
}
