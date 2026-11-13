import "server-only";
import type { CurrentUser } from "@/server/auth/current-user";
import type { OpportunityFormValues } from "./components/opportunity-form";
import type { OpportunityDetail } from "./queries";

const ymd = (d: Date | null | undefined) => (d ? d.toISOString().slice(0, 10) : "");

export function newOpportunityDefaults(
  me: CurrentUser,
  org: { id: string; nameEn: string } | null,
): OpportunityFormValues {
  return {
    name: "",
    organisation: org ? { id: org.id, label: org.nameEn } : null,
    source: "",
    referrerOrg: null,
    referrerContact: null,
    practiceAreaIds: [],
    leadPartner: me.role === "PARTNER" ? { id: me.id, label: me.name } : null,
    team: me.role === "BD" ? [{ id: me.id, label: me.name }] : [],
    feeEstimateMin: "",
    feeEstimateMax: "",
    currency: "THB",
    probability: "",
    stage: "LEAD",
    conflictStatus: "NOT_REQUESTED",
    expectedDecisionDate: "",
    competitors: "",
    confidential: false,
  };
}

export function opportunityToFormValues(o: OpportunityDetail): OpportunityFormValues {
  return {
    name: o.name,
    organisation: { id: o.organisation.id, label: o.organisation.nameEn },
    source: o.source,
    referrerOrg: o.referrerOrg ? { id: o.referrerOrg.id, label: o.referrerOrg.nameEn } : null,
    referrerContact: o.referrerContact ? { id: o.referrerContact.id, label: o.referrerContact.nameEn } : null,
    practiceAreaIds: o.practiceAreas.map((p) => p.id),
    leadPartner: { id: o.leadPartner.id, label: o.leadPartner.name },
    team: o.team.map((t) => ({ id: t.id, label: t.name })),
    feeEstimateMin: o.feeEstimateMin?.toString() ?? "",
    feeEstimateMax: o.feeEstimateMax?.toString() ?? "",
    currency: o.currency,
    probability: String(o.probability),
    stage: o.stage,
    conflictStatus: o.conflictStatus,
    expectedDecisionDate: ymd(o.expectedDecisionDate),
    competitors: o.competitors.join(", "),
    confidential: o.confidential,
  };
}
