import type { Metadata } from "next";
import Link from "next/link";
import { BarChart3, Columns3, List, Plus } from "lucide-react";
import { requireUser } from "@/server/auth/current-user";
import { can } from "@/server/auth/policy";
import { boardOpportunities, listOpportunities, oppFilterSchema } from "@/features/opportunities/queries";
import { toBoard, toTableRows } from "@/features/opportunities/to-rows";
import { OpportunitiesTable } from "@/features/opportunities/components/opportunities-table";
import { OpportunityBoard } from "@/features/opportunities/components/opportunity-board";
import { getSettings } from "@/features/settings/queries";
import { listPartnerOptions } from "@/features/organisations/queries";
import { practiceAreaOptions } from "@/features/lookups/options";
import {
  CONFLICT_LABELS,
  CONFLICT_STATUSES,
  OPP_SOURCES,
  OPP_SOURCE_LABELS,
  STAGES,
  STAGE_LABELS,
} from "@/features/labels";
import { PageHeader } from "@/components/layout/page-header";
import { FilterBar, FilterField } from "@/components/layout/filter-bar";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { DEFAULT_PAGE_SIZE } from "@/lib/list-params";
import { todayInBangkok } from "@/lib/dates";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Opportunities" };

export default async function OpportunitiesPage(props: PageProps<"/opportunities">) {
  const me = await requireUser();
  const sp = await props.searchParams;
  const f = oppFilterSchema.parse(sp);
  const view = sp.view === "board" ? "board" : "table";
  const [settings, partners, practices] = await Promise.all([
    getSettings(),
    listPartnerOptions(),
    practiceAreaOptions(),
  ]);

  const qs = (patch: Record<string, string>) => {
    const p = new URLSearchParams();
    for (const [k, v] of Object.entries(sp)) if (typeof v === "string" && k !== "page") p.set(k, v);
    for (const [k, v] of Object.entries(patch)) p.set(k, v);
    return `/opportunities?${p.toString()}`;
  };
  const tab = (v: "table" | "board", label: string, Icon: typeof List) => (
    <Link
      href={qs({ view: v })}
      aria-current={view === v ? "page" : undefined}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm",
        view === v ? "bg-primary text-primary-foreground" : "hover:bg-accent",
      )}
    >
      <Icon className="size-4" /> {label}
    </Link>
  );

  return (
    <>
      <PageHeader
        title="Opportunities"
        description="The firm’s pipeline. Confidential opportunities are visible only to the Head of BD and the team."
        actions={
          <>
            {can(me, "read", "PipelineSummary") && (
              <Button asChild variant="outline">
                <Link href="/opportunities/summary">
                  <BarChart3 /> Pipeline summary
                </Link>
              </Button>
            )}
            {can(me, "create", "Opportunity") && (
              <Button asChild>
                <Link href="/opportunities/new">
                  <Plus /> New opportunity
                </Link>
              </Button>
            )}
          </>
        }
      />
      <div className="mb-4 flex gap-1">
        {tab("table", "Table", List)}
        {tab("board", "Board", Columns3)}
      </div>
      <FilterBar resetHref={`/opportunities?view=${view}`}>
        <input type="hidden" name="view" value={view} />
        <FilterField label="Search name / client" htmlFor="q">
          <Input id="q" name="q" type="search" defaultValue={f.q} className="w-52" />
        </FilterField>
        {view === "table" && (
          <FilterField label="Status" htmlFor="status">
            <NativeSelect id="status" name="status" defaultValue={f.status}>
              <option value="open">Open</option>
              <option value="won">Won</option>
              <option value="lost">Lost</option>
              <option value="closed">Won + lost</option>
              <option value="all">All</option>
            </NativeSelect>
          </FilterField>
        )}
        {view === "table" && (
          <FilterField label="Stage" htmlFor="stage">
            <NativeSelect id="stage" name="stage" defaultValue={f.stage ?? ""}>
              <option value="">Any</option>
              {STAGES.map((s) => (
                <option key={s} value={s}>
                  {STAGE_LABELS[s]}
                </option>
              ))}
            </NativeSelect>
          </FilterField>
        )}
        <FilterField label="Lead partner" htmlFor="lead">
          <NativeSelect id="lead" name="lead" defaultValue={f.lead ?? ""}>
            <option value="">All</option>
            {partners.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
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
        <FilterField label="Source" htmlFor="source">
          <NativeSelect id="source" name="source" defaultValue={f.source ?? ""}>
            <option value="">All</option>
            {OPP_SOURCES.map((s) => (
              <option key={s} value={s}>
                {OPP_SOURCE_LABELS[s]}
              </option>
            ))}
          </NativeSelect>
        </FilterField>
        <FilterField label="Conflict" htmlFor="conflict">
          <NativeSelect id="conflict" name="conflict" defaultValue={f.conflict ?? ""}>
            <option value="">Any</option>
            {CONFLICT_STATUSES.map((c) => (
              <option key={c} value={c}>
                {CONFLICT_LABELS[c]}
              </option>
            ))}
          </NativeSelect>
        </FilterField>
        <div className="flex flex-col gap-1.5 pb-1 text-sm">
          <label className="flex items-center gap-2">
            <Checkbox name="mine" value="1" defaultChecked={!!f.mine} /> Mine
          </label>
          {view === "table" && (
            <label className="flex items-center gap-2">
              <Checkbox name="archived" value="1" defaultChecked={f.archived} /> Archived
            </label>
          )}
        </div>
      </FilterBar>
      {view === "board" ? (
        <BoardView me={me} f={f} rate={settings.usdToThbRate} />
      ) : (
        <TableView me={me} f={f} rate={settings.usdToThbRate} />
      )}
    </>
  );
}

async function TableView({
  me,
  f,
  rate,
}: {
  me: Awaited<ReturnType<typeof requireUser>>;
  f: ReturnType<typeof oppFilterSchema.parse>;
  rate: number;
}) {
  const { total, rows } = await listOpportunities(me, f);
  return (
    <OpportunitiesTable
      rows={toTableRows(rows, rate)}
      pagination={{ page: f.page, pageSize: DEFAULT_PAGE_SIZE, total }}
    />
  );
}

async function BoardView({
  me,
  f,
  rate,
}: {
  me: Awaited<ReturnType<typeof requireUser>>;
  f: ReturnType<typeof oppFilterSchema.parse>;
  rate: number;
}) {
  const rows = await boardOpportunities(me, f);
  const { cards, columnTotals } = toBoard(me, rows, rate);
  return (
    <OpportunityBoard cards={cards} columnTotals={columnTotals} today={todayInBangkok().toISOString().slice(0, 10)} />
  );
}
