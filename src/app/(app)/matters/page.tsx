import type { Metadata } from "next";
import Link from "next/link";
import { Lock, Plus } from "lucide-react";
import { requireUser } from "@/server/auth/current-user";
import { can } from "@/server/auth/policy";
import { listMatters, matterFilterSchema } from "@/features/matters/queries";
import { matterClientLabel } from "@/features/rankings/rules";
import { practiceAreaOptions } from "@/features/lookups/options";
import { PageHeader } from "@/components/layout/page-header";
import { FilterBar, FilterField } from "@/components/layout/filter-bar";
import { Pager } from "@/components/layout/pager";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatMoney } from "@/lib/money";
import { DEFAULT_PAGE_SIZE } from "@/lib/list-params";

export const metadata: Metadata = { title: "Representative matters" };

export default async function MattersPage(props: PageProps<"/matters">) {
  const me = await requireUser();
  const sp = await props.searchParams;
  const f = matterFilterSchema.parse(sp);
  const [{ total, rows }, practices] = await Promise.all([listMatters(me, f), practiceAreaOptions()]);
  return (
    <>
      <PageHeader
        title="Representative matters"
        description="Credentials for pitches and directory submissions. Confidential matters are visible only to the Head of BD and the team."
        actions={
          can(me, "create", "RepresentativeMatter") && (
            <Button asChild>
              <Link href="/matters/new">
                <Plus /> New matter
              </Link>
            </Button>
          )
        }
      />
      <FilterBar resetHref="/matters">
        <FilterField label="Search title / client" htmlFor="q">
          <Input id="q" name="q" type="search" defaultValue={f.q} className="w-56" />
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
        <FilterField label="Year" htmlFor="year">
          <Input id="year" name="year" type="number" defaultValue={f.year} className="w-28" />
        </FilterField>
        <div className="flex flex-col gap-1.5 pb-1 text-sm">
          <label className="flex items-center gap-2">
            <Checkbox name="publishable" value="1" defaultChecked={!!f.publishable} /> Publishable only
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
                <TableHead>Matter</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Year</TableHead>
                <TableHead>Practice</TableHead>
                <TableHead>Value</TableHead>
                <TableHead>Use</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 && (
                <TableRow className="hover:bg-transparent">
                  <TableCell colSpan={6} className="text-muted-foreground h-20 text-center">
                    No matters match.
                  </TableCell>
                </TableRow>
              )}
              {rows.map((m) => (
                <TableRow key={m.id}>
                  <TableCell>
                    <Link href={`/matters/${m.id}`} className="font-medium hover:underline">
                      {m.confidential && (
                        <Lock className="text-destructive mr-1 inline size-3" aria-label="Confidential" />
                      )}
                      {m.title}
                    </Link>
                  </TableCell>
                  <TableCell className="text-xs">{matterClientLabel(m)}</TableCell>
                  <TableCell className="tabular-nums">{m.year}</TableCell>
                  <TableCell className="text-xs">{m.practiceAreas.map((p) => p.name).join(", ")}</TableCell>
                  <TableCell className="text-xs whitespace-nowrap">{formatMoney(m.value, m.currency) || "—"}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {m.confidential ? (
                        <Badge variant="destructive">Confidential</Badge>
                      ) : m.publishable ? (
                        <Badge variant="success">Publishable</Badge>
                      ) : (
                        <Badge variant="outline">Not publishable</Badge>
                      )}
                      {m.anonymised && <Badge variant="secondary">Anonymised</Badge>}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      <Pager page={f.page} pageSize={DEFAULT_PAGE_SIZE} total={total} params={sp} path="/matters" />
    </>
  );
}
