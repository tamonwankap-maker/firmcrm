import type { MatterFormValues } from "./components/matter-form";
import type { MatterRow } from "./queries";

export function emptyMatter(year: number): MatterFormValues {
  return {
    title: "",
    clientOrganisation: null,
    clientDisplayName: "",
    anonymised: false,
    practiceAreaIds: [],
    value: "",
    currency: "THB",
    year: String(year),
    publishable: false,
    confidential: false,
    team: [],
    description: "",
  };
}

export function matterToFormValues(m: MatterRow): MatterFormValues {
  return {
    title: m.title,
    clientOrganisation: m.clientOrganisation
      ? { id: m.clientOrganisation.id, label: m.clientOrganisation.nameEn }
      : null,
    clientDisplayName: m.clientDisplayName ?? "",
    anonymised: m.anonymised,
    practiceAreaIds: m.practiceAreas.map((p) => p.id),
    value: m.value?.toString() ?? "",
    currency: m.currency,
    year: String(m.year),
    publishable: m.publishable,
    confidential: m.confidential,
    team: m.team.map((t) => ({ id: t.id, label: t.name })),
    description: m.description,
  };
}
