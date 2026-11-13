import "server-only";
import { db } from "@/server/db";
import { opportunityVisibleWhere } from "@/server/auth/visibility";
import { getSettings } from "../../settings/queries";
import { feeEstimate } from "../../opportunities/rules";
import { toThb } from "@/lib/money";
import { OPP_SOURCES, OPP_SOURCE_LABELS } from "../../labels";
import type { ReportDef } from "../types";
import { endOfDayBangkok, startOfDayBangkok } from "../params";

/** Where work comes from: opportunities created in the period by source and referrer. */
export const sourcesReport: ReportDef = {
  id: "sources",
  title: "Sources & referrers",
  description: "New opportunities by source and by referring firm or person, with wins.",
  roles: ["ADMIN", "BD"],
  params: ["dateRange"],
  async run(actor, p) {
    const settings = await getSettings();
    const opps = await db.opportunity.findMany({
      where: {
        AND: [
          opportunityVisibleWhere(actor),
          { createdAt: { gte: startOfDayBangkok(p.from), lt: endOfDayBangkok(p.to) } },
        ],
      },
      include: { referrerOrg: { select: { nameEn: true } }, referrerContact: { select: { nameEn: true } } },
    });
    const groups = new Map<
      string,
      { source: string; referrer: string; count: number; won: number; lost: number; open: number; wonValue: number }
    >();
    for (const o of opps) {
      const referrer = [o.referrerOrg?.nameEn, o.referrerContact?.nameEn].filter(Boolean).join(" / ") || "—";
      const key = `${o.source}|${referrer}`;
      const g = groups.get(key) ?? {
        source: OPP_SOURCE_LABELS[o.source],
        referrer,
        count: 0,
        won: 0,
        lost: 0,
        open: 0,
        wonValue: 0,
      };
      g.count++;
      if (o.stage === "WON") {
        g.won++;
        const fee = feeEstimate(o.feeEstimateMin, o.feeEstimateMax);
        g.wonValue += fee == null ? 0 : toThb(fee, o.currency, settings.usdToThbRate);
      } else if (o.stage === "LOST") g.lost++;
      else g.open++;
      groups.set(key, g);
    }
    const rows = [...groups.values()]
      .sort((a, b) => b.count - a.count)
      .map((g) => ({ ...g, wonValue: Math.round(g.wonValue) }));
    return {
      columns: [
        { key: "source", label: "Source", type: "text" },
        { key: "referrer", label: "Referrer", type: "text" },
        { key: "count", label: "Opportunities", type: "number" },
        { key: "open", label: "Open", type: "number" },
        { key: "won", label: "Won", type: "number" },
        { key: "lost", label: "Lost", type: "number" },
        { key: "wonValue", label: "Won value (THB)", type: "money" },
      ],
      rows,
      totals: {
        source: "Total",
        count: rows.reduce((s, r) => s + r.count, 0),
        open: rows.reduce((s, r) => s + r.open, 0),
        won: rows.reduce((s, r) => s + r.won, 0),
        lost: rows.reduce((s, r) => s + r.lost, 0),
        wonValue: rows.reduce((s, r) => s + r.wonValue, 0),
      },
      notes: ["Counts opportunities created in the period; outcome as of today."],
      chart: {
        kind: "bar",
        xKey: "source",
        series: [{ key: "count", label: "New opportunities" }],
        valueType: "number",
        horizontal: true,
        data: OPP_SOURCES.map((s) => ({
          source: OPP_SOURCE_LABELS[s],
          count: opps.filter((o) => o.source === s).length,
        })).filter((r) => r.count > 0),
      },
    };
  },
};
