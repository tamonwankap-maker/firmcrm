import "server-only";
import type { Prisma } from "@/generated/prisma/client";
import { db } from "@/server/db";
import { opportunityMemberWhere, opportunityVisibleWhere } from "@/server/auth/visibility";
import { getSettings } from "../../settings/queries";
import { feeEstimate, winRate } from "../../opportunities/rules";
import { toThb } from "@/lib/money";
import { OPP_SOURCE_LABELS, OUTCOME_REASON_LABELS, OUTCOME_REASONS, STAGE_LABELS } from "../../labels";
import type { ReportDef } from "../types";

/** Opportunities decided in the period, with reasons; chart = won vs lost by practice area. */
export const winLossReport: ReportDef = {
  id: "win-loss",
  title: "Win / loss analysis",
  description: "Opportunities won or lost in the period, with reasons and win rate by practice area.",
  roles: ["ADMIN", "BD", "PARTNER"],
  params: ["dateRange", "practice"],
  async run(actor, p) {
    const settings = await getSettings();
    const where: Prisma.OpportunityWhereInput = {
      AND: [
        opportunityVisibleWhere(actor),
        { stage: { in: ["WON", "LOST"] }, closedDate: { gte: p.from, lte: p.to } },
        actor.role === "PARTNER" ? opportunityMemberWhere(actor) : {},
        p.practice ? { practiceAreas: { some: { id: p.practice } } } : {},
      ],
    };
    const opps = await db.opportunity.findMany({
      where,
      orderBy: { closedDate: "desc" },
      include: {
        organisation: { select: { nameEn: true } },
        leadPartner: { select: { name: true } },
        practiceAreas: { select: { name: true } },
      },
    });
    const rows = opps.map((o) => {
      const fee = feeEstimate(o.feeEstimateMin, o.feeEstimateMax);
      return {
        closed: o.closedDate?.toISOString() ?? null,
        name: o.name,
        client: o.organisation.nameEn,
        outcome: STAGE_LABELS[o.stage],
        reason: o.outcomeReason ? OUTCOME_REASON_LABELS[o.outcomeReason] : null,
        notes: o.outcome,
        source: OPP_SOURCE_LABELS[o.source],
        lead: o.leadPartner.name,
        practice: o.practiceAreas.map((x) => x.name).join(", "),
        value: fee == null ? null : Math.round(toThb(fee, o.currency, settings.usdToThbRate)),
      };
    });
    const won = opps.filter((o) => o.stage === "WON");
    const lost = opps.filter((o) => o.stage === "LOST");
    const rate = winRate(won.length, lost.length);

    const practices = new Map<string, { won: number; lost: number }>();
    for (const o of opps) {
      for (const pa of o.practiceAreas.length ? o.practiceAreas : [{ name: "Unassigned" }]) {
        const cur = practices.get(pa.name) ?? { won: 0, lost: 0 };
        if (o.stage === "WON") cur.won++;
        else cur.lost++;
        practices.set(pa.name, cur);
      }
    }
    const lossReasons = OUTCOME_REASONS.map((r) => ({ r, n: lost.filter((o) => o.outcomeReason === r).length })).filter(
      (x) => x.n > 0,
    );

    return {
      columns: [
        { key: "closed", label: "Decided", type: "date" },
        { key: "name", label: "Opportunity", type: "text" },
        { key: "client", label: "Client", type: "text" },
        { key: "outcome", label: "Outcome", type: "text" },
        { key: "reason", label: "Reason", type: "text" },
        { key: "notes", label: "Notes", type: "text" },
        { key: "source", label: "Source", type: "text" },
        { key: "lead", label: "Lead partner", type: "text" },
        { key: "practice", label: "Practice", type: "text" },
        { key: "value", label: "Fee estimate (THB)", type: "money" },
      ],
      rows,
      highlights: [
        { label: "Won", value: String(won.length) },
        { label: "Lost", value: String(lost.length) },
        { label: "Win rate", value: rate == null ? "—" : `${rate}%` },
        {
          label: "Top loss reason",
          value: lossReasons.sort((a, b) => b.n - a.n)[0] ? OUTCOME_REASON_LABELS[lossReasons[0].r] : "—",
        },
      ],
      notes: [
        actor.role === "PARTNER"
          ? "Your opportunities only."
          : actor.role === "ADMIN"
            ? "Includes confidential opportunities."
            : "Confidential opportunities you are not on are excluded.",
      ],
      chart: {
        kind: "bar",
        xKey: "practice",
        series: [
          { key: "won", label: "Won" },
          { key: "lost", label: "Lost" },
        ],
        valueType: "number",
        horizontal: true,
        data: [...practices.entries()]
          .map(([practice, v]) => ({ practice, ...v }))
          .sort((a, b) => b.won + b.lost - (a.won + a.lost)),
      },
    };
  },
};
