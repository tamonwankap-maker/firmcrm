import type { Metadata } from "next";
import Link from "next/link";
import { Plus } from "lucide-react";
import { requireUser } from "@/server/auth/current-user";
import { can } from "@/server/auth/policy";
import { activityFilterSchema, listActivities } from "@/features/activities/queries";
import { ActivityTimeline } from "@/features/activities/components/activity-timeline";
import { userOptions } from "@/features/lookups/options";
import { ACTIVITY_TYPES, ACTIVITY_TYPE_LABELS } from "@/features/labels";
import { PageHeader } from "@/components/layout/page-header";
import { FilterBar, FilterField } from "@/components/layout/filter-bar";
import { Pager } from "@/components/layout/pager";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { DEFAULT_PAGE_SIZE } from "@/lib/list-params";

export const metadata: Metadata = { title: "Activities" };

export default async function ActivitiesPage(props: PageProps<"/activities">) {
  const me = await requireUser();
  const sp = await props.searchParams;
  const f = activityFilterSchema.parse(sp);
  const [{ total, rows }, users] = await Promise.all([listActivities(me, f), userOptions()]);
  return (
    <>
      <PageHeader
        title="Activities"
        description="Every client touchpoint, newest first."
        actions={
          can(me, "create", "Activity") && (
            <Button asChild>
              <Link href="/activities/new">
                <Plus /> Log activity
              </Link>
            </Button>
          )
        }
      />
      <FilterBar resetHref="/activities">
        <FilterField label="Search summary" htmlFor="q">
          <Input id="q" name="q" type="search" defaultValue={f.q} className="w-52" />
        </FilterField>
        <FilterField label="Type" htmlFor="type">
          <NativeSelect id="type" name="type" defaultValue={f.type ?? ""}>
            <option value="">All</option>
            {ACTIVITY_TYPES.map((t) => (
              <option key={t} value={t}>
                {ACTIVITY_TYPE_LABELS[t]}
              </option>
            ))}
          </NativeSelect>
        </FilterField>
        <FilterField label="Owner" htmlFor="owner">
          <NativeSelect id="owner" name="owner" defaultValue={f.owner ?? ""}>
            <option value="">All</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name}
              </option>
            ))}
          </NativeSelect>
        </FilterField>
        <FilterField label="From" htmlFor="from">
          <Input id="from" name="from" type="date" defaultValue={f.from} />
        </FilterField>
        <FilterField label="To" htmlFor="to">
          <Input id="to" name="to" type="date" defaultValue={f.to} />
        </FilterField>
        <label className="flex items-center gap-2 pb-2 text-sm">
          <Checkbox name="mine" value="1" defaultChecked={!!f.mine} /> Mine
        </label>
      </FilterBar>
      <Card>
        <CardContent className="pt-5">
          <ActivityTimeline activities={rows} actor={me} emptyMessage="No activities match." returnTo="/activities" />
        </CardContent>
      </Card>
      <Pager page={f.page} pageSize={DEFAULT_PAGE_SIZE} total={total} params={sp} path="/activities" />
    </>
  );
}
