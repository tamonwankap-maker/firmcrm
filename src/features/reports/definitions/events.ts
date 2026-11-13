import "server-only";
import { db } from "@/server/db";
import { costPerAttendee, inviteStats } from "../../events/rules";
import { EVENT_STATUS_LABELS } from "../../labels";
import type { ReportDef } from "../types";
import { endOfDayBangkok, startOfDayBangkok } from "../params";

export const eventsReport: ReportDef = {
  id: "events",
  title: "Event return",
  description: "Invitations, attendance, follow-ups and cost per attendee for events in the period.",
  roles: ["ADMIN", "BD"],
  params: ["dateRange"],
  async run(_actor, p) {
    const events = await db.event.findMany({
      where: { archivedAt: null, startsAt: { gte: startOfDayBangkok(p.from), lt: endOfDayBangkok(p.to) } },
      orderBy: { startsAt: "asc" },
      include: {
        invites: { select: { invited: true, rsvp: true, attended: true, followUpOwnerId: true, followUpDone: true } },
      },
    });
    const rows = events.map((e) => {
      const s = inviteStats(e.invites);
      const actual = e.actualCost == null ? null : Number(e.actualCost);
      return {
        date: e.startsAt.toISOString(),
        title: e.title,
        status: EVENT_STATUS_LABELS[e.status],
        invited: s.invited,
        yes: s.yes,
        attended: s.attended,
        attendance: s.yes ? s.attended / s.yes : null,
        followUpsOpen: s.followUpsOpen,
        budget: e.budget == null ? null : Number(e.budget),
        actual,
        perAttendee: costPerAttendee(actual, s.attended),
        currency: e.currency,
      };
    });
    return {
      columns: [
        { key: "date", label: "Date", type: "date" },
        { key: "title", label: "Event", type: "text" },
        { key: "status", label: "Status", type: "text" },
        { key: "invited", label: "Invited", type: "number" },
        { key: "yes", label: "Accepted", type: "number" },
        { key: "attended", label: "Attended", type: "number" },
        { key: "attendance", label: "Show rate", type: "percent" },
        { key: "followUpsOpen", label: "Follow-ups open", type: "number" },
        { key: "budget", label: "Budget", type: "money" },
        { key: "actual", label: "Actual cost", type: "money" },
        { key: "perAttendee", label: "Cost / attendee", type: "money" },
        { key: "currency", label: "Ccy", type: "text" },
      ],
      rows,
      totals: {
        title: `Total (${rows.length})`,
        invited: rows.reduce((s, r) => s + r.invited, 0),
        attended: rows.reduce((s, r) => s + r.attended, 0),
        followUpsOpen: rows.reduce((s, r) => s + r.followUpsOpen, 0),
      },
      notes: ["Show rate = attended ÷ accepted. Amounts are in each event’s own currency."],
    };
  },
};
