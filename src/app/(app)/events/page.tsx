import type { Metadata } from "next";
import Link from "next/link";
import { Plus } from "lucide-react";
import { requireUser } from "@/server/auth/current-user";
import { can } from "@/server/auth/policy";
import { eventFilterSchema, listEvents } from "@/features/events/queries";
import { inviteStats } from "@/features/events/rules";
import { EVENT_FORMAT_LABELS, EVENT_STATUSES, EVENT_STATUS_LABELS } from "@/features/labels";
import { PageHeader } from "@/components/layout/page-header";
import { FilterBar, FilterField } from "@/components/layout/filter-bar";
import { Pager } from "@/components/layout/pager";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDateTime } from "@/lib/dates";
import { DEFAULT_PAGE_SIZE } from "@/lib/list-params";

export const metadata: Metadata = { title: "Events" };

export default async function EventsPage(props: PageProps<"/events">) {
  const me = await requireUser();
  const sp = await props.searchParams;
  const f = eventFilterSchema.parse(sp);
  const { total, rows } = await listEvents(f);
  return (
    <>
      <PageHeader
        title="Events"
        description="Seminars, client dinners and webinars — invitations, RSVPs, attendance and follow-ups."
        actions={
          can(me, "create", "Event") && (
            <Button asChild>
              <Link href="/events/new">
                <Plus /> New event
              </Link>
            </Button>
          )
        }
      />
      <FilterBar resetHref="/events">
        <FilterField label="Search" htmlFor="filter-q">
          <Input id="filter-q" name="q" type="search" defaultValue={f.q} className="w-52" />
        </FilterField>
        <FilterField label="When" htmlFor="filter-when">
          <NativeSelect id="filter-when" name="when" defaultValue={f.when}>
            <option value="upcoming">Upcoming</option>
            <option value="past">Past</option>
            <option value="all">All</option>
          </NativeSelect>
        </FilterField>
        <FilterField label="Status" htmlFor="filter-status">
          <NativeSelect id="filter-status" name="status" defaultValue={f.status ?? ""}>
            <option value="">All</option>
            {EVENT_STATUSES.map((s) => (
              <option key={s} value={s}>
                {EVENT_STATUS_LABELS[s]}
              </option>
            ))}
          </NativeSelect>
        </FilterField>
      </FilterBar>
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>When</TableHead>
                <TableHead>Event</TableHead>
                <TableHead>Speakers</TableHead>
                <TableHead>Invited</TableHead>
                <TableHead>Yes</TableHead>
                <TableHead>Attended</TableHead>
                <TableHead>Follow-ups open</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 && (
                <TableRow className="hover:bg-transparent">
                  <TableCell colSpan={8} className="text-muted-foreground h-20 text-center">
                    No events.
                  </TableCell>
                </TableRow>
              )}
              {rows.map((e) => {
                const s = inviteStats(e.invites);
                return (
                  <TableRow key={e.id}>
                    <TableCell className="text-xs whitespace-nowrap">{formatDateTime(e.startsAt)}</TableCell>
                    <TableCell>
                      <Link href={`/events/${e.id}`} className="font-medium hover:underline">
                        {e.title}
                      </Link>
                      <div className="text-muted-foreground text-xs">
                        {EVENT_FORMAT_LABELS[e.format]}
                        {e.practiceAreas.length > 0 && ` · ${e.practiceAreas.map((p) => p.name).join(", ")}`}
                      </div>
                    </TableCell>
                    <TableCell className="text-xs">{e.speakers.map((p) => p.name).join(", ")}</TableCell>
                    <TableCell className="tabular-nums">{s.invited}</TableCell>
                    <TableCell className="tabular-nums">{s.yes}</TableCell>
                    <TableCell className="tabular-nums">{s.attended}</TableCell>
                    <TableCell className="tabular-nums">{s.followUpsOpen}</TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          e.status === "HELD" ? "success" : e.status === "CANCELLED" ? "destructive" : "secondary"
                        }
                      >
                        {EVENT_STATUS_LABELS[e.status]}
                      </Badge>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      <Pager page={f.page} pageSize={DEFAULT_PAGE_SIZE} total={total} params={sp} path="/events" />
    </>
  );
}
