import type { Metadata } from "next";
import Link from "next/link";
import { requireUser } from "@/server/auth/current-user";
import { can } from "@/server/auth/policy";
import { listTasks, taskFilterSchema } from "@/features/tasks/queries";
import { toTaskRows } from "@/features/tasks/to-rows";
import { TaskList } from "@/features/tasks/components/task-list";
import { QuickTaskForm } from "@/features/tasks/components/quick-task-form";
import { userOptions } from "@/features/lookups/options";
import { PageHeader } from "@/components/layout/page-header";
import { FilterBar, FilterField } from "@/components/layout/filter-bar";
import { Pager } from "@/components/layout/pager";
import { Card, CardContent } from "@/components/ui/card";
import { NativeSelect } from "@/components/ui/native-select";
import { DEFAULT_PAGE_SIZE } from "@/lib/list-params";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Tasks" };

export default async function TasksPage(props: PageProps<"/tasks">) {
  const me = await requireUser();
  const sp = await props.searchParams;
  const f = taskFilterSchema.parse(sp);
  const seeAll = me.role === "ADMIN" || me.role === "BD";
  const [{ total, rows }, users] = await Promise.all([listTasks(me, f), seeAll ? userOptions() : Promise.resolve([])]);
  const tab = (scope: "mine" | "all", label: string) => (
    <Link
      href={`/tasks?scope=${scope}`}
      className={cn(
        "rounded-md px-3 py-1.5 text-sm",
        f.scope === scope ? "bg-primary text-primary-foreground" : "hover:bg-accent",
      )}
    >
      {label}
    </Link>
  );
  return (
    <>
      <PageHeader title="Tasks" />
      {seeAll && (
        <div className="mb-4 flex gap-1" role="tablist">
          {tab("mine", "My tasks")}
          {tab("all", "Team tasks")}
        </div>
      )}
      <FilterBar resetHref={`/tasks?scope=${f.scope}`}>
        <input type="hidden" name="scope" value={f.scope} />
        <FilterField label="Status" htmlFor="status">
          <NativeSelect id="status" name="status" defaultValue={f.status}>
            <option value="open">Open</option>
            <option value="done">Done / cancelled</option>
            <option value="all">All</option>
          </NativeSelect>
        </FilterField>
        {f.scope === "all" && seeAll && (
          <FilterField label="Owner" htmlFor="owner">
            <NativeSelect id="owner" name="owner" defaultValue={f.owner ?? ""}>
              <option value="">Everyone</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
            </NativeSelect>
          </FilterField>
        )}
      </FilterBar>
      <Card>
        <CardContent className="flex flex-col gap-4 pt-5">
          {can(me, "create", "Task") && <QuickTaskForm />}
          <TaskList
            tasks={toTaskRows(me, rows)}
            showOwner={f.scope === "all"}
            emptyMessage="Nothing here — well done."
          />
        </CardContent>
      </Card>
      <Pager page={f.page} pageSize={DEFAULT_PAGE_SIZE} total={total} params={sp} path="/tasks" />
    </>
  );
}
