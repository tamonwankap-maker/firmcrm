import "server-only";
import type { Prisma } from "@/generated/prisma/client";
import { db } from "@/server/db";
import { opportunityMemberWhere, opportunityVisibleWhere } from "@/server/auth/visibility";
import { getSettings } from "../../settings/queries";
import { weightedValueThb } from "../../opportunities/rules";
import { ACTIVE_STAGES, CONFLICT_LABELS, OPEN_STAGES, STAGE_LABELS } from "../../labels";
import type { ReportDef } from "../types";

/** Open pipeline. Partners see only deals they lead or are on; confidential deals follow visibility rules. */
export const pipelineReport: ReportDef = {
  id: "pipeline",
  title: "Open pipeline",
  description: "All open opportunities with fee estimates and weighted value (THB).",
  roles: ["ADMIN", "BD", "PARTNER"],
  params: ["practice"],
  async run(actor, p) {
    const settings = await getSettings();
    const where: Prisma.OpportunityWhereInput = {
      AND: [
        opportunityVisibleWhere(actor),
        { stage: { in: [...OPEN_STAGES] } },
        actor.role === "PARTNER" ? opportunityMemberWhere(actor) : {},
        p.practice ? { practiceAreas: { some: { id: p.practice } } } : {},
      ],
    };
    const opps = await db.opportunity.findMany({
      where,
      orderBy: [{ stage: "asc" }, { expectedDecisionDate: { sort: "asc", nulls: "last" } }],
      include: {
        organisation: { select: { nameEn: true } },
        leadPartner: { select: { name: true } },
        practiceAreas: { select: { name: true } },
      },
    });
    const rows = opps.map((o) => ({
      name: o.name,
      client: o.organisation.nameEn,
      stage: STAGE_LABELS[o.stage],
      lead: o.leadPartner.name,
      practice: o.practiceAreas.map((x) => x.name).join(", "),
      feeMin: o.feeEstimateMin == null ? null : Number(o.feeEstimateMin),
      feeMax: o.feeEstimateMax == null ? null : Number(o.feeEstimateMax),
      currency: o.currency,
      probability: o.probability / 100,
      weighted: Math.round(weightedValueThb(o, settings.usdToThbRate)),
      decision: o.expectedDecisionDate?.toISOString() ?? null,
      conflict: CONFLICT_LABELS[o.conflictStatus],
    }));
    const total = rows.reduce((s, r) => s + r.weighted, 0);
    return {
      columns: [
        { key: "name", label: "Opportunity", type: "text" },
        { key: "client", label: "Client", type: "text" },
        { key: "stage", label: "Stage", type: "text" },
        { key: "lead", label: "Lead partner", type: "text" },
        { key: "practice", label: "Practice", type: "text" },
        { key: "feeMin", label: "Fee min", type: "money" },
        { key: "feeMax", label: "Fee max", type: "money" },
        { key: "currency", label: "Ccy", type: "text" },
        { key: "probability", label: "Prob.", type: "percent" },
        { key: "weighted", label: "Weighted (THB)", type: "money" },
        { key: "decision", label: "Decision", type: "date" },
        { key: "conflict", label: "Conflict", type: "text" },
      ],
      rows,
      totals: { name: `Total (${rows.length})`, weighted: total },
      highlights: [
        { label: "Open opportunities", value: String(rows.length) },
        { label: "Weighted pipeline", value: `฿${Math.round(total).toLocaleString("en-GB")}` },
      ],
      notes: [
        `USD converted at ${settings.usdToThbRate} THB. Weighted = midpoint fee × probability.`,
        actor.role === "ADMIN"
          ? "Includes confidential opportunities."
          : actor.role === "PARTNER"
            ? "Your opportunities only (lead partner or team member)."
            : "Confidential opportunities you are not on are excluded.",
      ],
      chart: {
        kind: "bar",
        xKey: "stage",
        series: [{ key: "weighted", label: "Weighted pipeline (THB)" }],
        valueType: "money",
        data: ACTIVE_STAGES.map((s) => ({
          stage: STAGE_LABELS[s],
          weighted: rows.filter((r) => r.stage === STAGE_LABELS[s]).reduce((sum, r) => sum + r.weighted, 0),
        })),
      },
    };
  },
};
