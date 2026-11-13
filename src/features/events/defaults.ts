import { bangkokInputDaysFromNow, toBangkokInput } from "@/lib/dates";
import type { EventFormValues } from "./components/event-form";
import type { EventDetail } from "./queries";

export function newEventDefaults(owner: { id: string; name: string }): EventFormValues {
  return {
    title: "",
    startsAt: bangkokInputDaysFromNow(30, "08:30"),
    endsAt: "",
    format: "IN_PERSON",
    venue: "",
    onlineUrl: "",
    practiceAreaIds: [],
    speakers: [],
    externalSpeakers: "",
    owner: { id: owner.id, label: owner.name },
    budget: "",
    actualCost: "",
    currency: "THB",
    status: "PLANNING",
    notes: "",
  };
}

export function eventToFormValues(e: EventDetail): EventFormValues {
  return {
    title: e.title,
    startsAt: toBangkokInput(e.startsAt),
    endsAt: toBangkokInput(e.endsAt),
    format: e.format,
    venue: e.venue ?? "",
    onlineUrl: e.onlineUrl ?? "",
    practiceAreaIds: e.practiceAreas.map((p) => p.id),
    speakers: e.speakers.map((s) => ({ id: s.id, label: s.name })),
    externalSpeakers: e.externalSpeakers ?? "",
    owner: e.owner ? { id: e.owner.id, label: e.owner.name } : null,
    budget: e.budget?.toString() ?? "",
    actualCost: e.actualCost?.toString() ?? "",
    currency: e.currency,
    status: e.status,
    notes: e.notes ?? "",
  };
}
