import "server-only";
import { db } from "@/server/db";
import { activityVisibleWhere } from "@/server/auth/visibility";
import { ACTIVITY_TYPES, ACTIVITY_TYPE_LABELS } from "../../labels";
import type { ReportDef } from "../types";

/** Client touchpoints per person (as owner or attendee) by activity type. Partners see their own row. */
export const activityReport: ReportDef = {
  id: "activity",
  title: "Activity by person",
  description: "Meetings, calls, lunches, referrals and gifts per partner / BD member in the period.",
  roles: ["ADMIN", "BD", "PARTNER"],
  params: ["dateRange"],
  async run(actor, p) {
    const acts = await db.activity.findMany({
      where: {
        AND: [
          activityVisibleWhere(actor),
          { date: { gte: p.from, lte: p.to } },
          actor.role === "PARTNER"
            ? { OR: [{ ownerId: actor.id }, { internalAttendees: { some: { id: actor.id } } }] }
            : {},
        ],
      },
      select: {
        type: true,
        ownerId: true,
        owner: { select: { id: true, name: true } },
        internalAttendees: { select: { id: true, name: true } },
      },
    });
    const people = new Map<string, { name: string; counts: Record<string, number> }>();
    for (const a of acts) {
      const involved = new Map([
        [a.owner.id, a.owner.name],
        ...a.internalAttendees.map((u) => [u.id, u.name] as const),
      ]);
      for (const [id, name] of involved) {
        if (actor.role === "PARTNER" && id !== actor.id) continue;
        const cur = people.get(id) ?? { name, counts: {} };
        cur.counts[a.type] = (cur.counts[a.type] ?? 0) + 1;
        people.set(id, cur);
      }
    }
    const rows = [...people.values()]
      .map((p) => ({
        person: p.name,
        ...Object.fromEntries(ACTIVITY_TYPES.map((t) => [t, p.counts[t] ?? 0])),
        total: Object.values(p.counts).reduce((s, n) => s + n, 0),
      }))
      .sort((a, b) => b.total - a.total);
    const usedTypes = ACTIVITY_TYPES.filter((t) => rows.some((r) => (r as Record<string, number | string>)[t] !== 0));
    return {
      columns: [
        { key: "person", label: "Person", type: "text" },
        ...ACTIVITY_TYPES.map((t) => ({ key: t, label: ACTIVITY_TYPE_LABELS[t], type: "number" as const })),
        { key: "total", label: "Total", type: "number" },
      ],
      rows,
      highlights: [{ label: "Activities logged", value: String(acts.length) }],
      notes: [
        "A person is counted once per activity they owned or attended.",
        ...(actor.role === "PARTNER" ? ["Your own activity only."] : []),
      ],
      chart: {
        kind: "bar",
        xKey: "person",
        series: usedTypes.map((t) => ({ key: t, label: ACTIVITY_TYPE_LABELS[t] })),
        stacked: true,
        horizontal: true,
        valueType: "number",
        data: rows.slice(0, 15),
      },
    };
  },
};
