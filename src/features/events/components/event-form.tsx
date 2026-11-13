"use client";

import { useState } from "react";
import { useFormAction } from "@/components/forms/use-form-action";
import { Field } from "@/components/forms/field";
import { FormStatus, fieldErrors } from "@/components/forms/form-shell";
import { Picker } from "@/components/forms/picker";
import { PracticeAreaCheckboxes } from "@/components/forms/practice-area-checkboxes";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import type { ActionResult } from "@/server/actions/result";
import type { PickerOption } from "@/features/pickers/actions";
import {
  CURRENCIES,
  EVENT_FORMATS,
  EVENT_FORMAT_LABELS,
  EVENT_STATUSES,
  EVENT_STATUS_LABELS,
  type EventFormatKey,
  type EventStatusKey,
} from "../../labels";

export interface EventFormValues {
  title: string;
  startsAt: string;
  endsAt: string;
  format: EventFormatKey;
  venue: string;
  onlineUrl: string;
  practiceAreaIds: string[];
  speakers: PickerOption[];
  externalSpeakers: string;
  owner: PickerOption | null;
  budget: string;
  actualCost: string;
  currency: "THB" | "USD";
  status: EventStatusKey;
  notes: string;
}

export function EventForm({
  action,
  defaults,
  practiceAreas,
  submitLabel,
}: {
  action: (prev: ActionResult | null, form: FormData) => Promise<ActionResult>;
  defaults: EventFormValues;
  practiceAreas: { id: string; name: string }[];
  submitLabel: string;
}) {
  const [state, onSubmit, pending] = useFormAction(action);
  const [format, setFormat] = useState(defaults.format);
  const e = fieldErrors(state);
  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <FormStatus state={state} />
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Title" htmlFor="title" error={e.title} required className="sm:col-span-2">
          <Input
            id="title"
            name="title"
            defaultValue={defaults.title}
            required
            placeholder="e.g. Thailand M&A Outlook 2027 breakfast seminar"
          />
        </Field>
        <Field label="Status" htmlFor="status" error={e.status}>
          <NativeSelect id="status" name="status" defaultValue={defaults.status}>
            {EVENT_STATUSES.map((s) => (
              <option key={s} value={s}>
                {EVENT_STATUS_LABELS[s]}
              </option>
            ))}
          </NativeSelect>
        </Field>
        <Field label="Starts (Bangkok time)" htmlFor="startsAt" error={e.startsAt} required>
          <Input id="startsAt" name="startsAt" type="datetime-local" defaultValue={defaults.startsAt} required />
        </Field>
        <Field label="Ends" htmlFor="endsAt" error={e.endsAt}>
          <Input id="endsAt" name="endsAt" type="datetime-local" defaultValue={defaults.endsAt} />
        </Field>
        <Field label="Format" htmlFor="format" error={e.format}>
          <NativeSelect
            id="format"
            name="format"
            value={format}
            onChange={(ev) => setFormat(ev.target.value as EventFormatKey)}
          >
            {EVENT_FORMATS.map((f) => (
              <option key={f} value={f}>
                {EVENT_FORMAT_LABELS[f]}
              </option>
            ))}
          </NativeSelect>
        </Field>
        {format !== "ONLINE" && (
          <Field label="Venue" htmlFor="venue" error={e.venue} required className="sm:col-span-2">
            <Input
              id="venue"
              name="venue"
              defaultValue={defaults.venue}
              placeholder="e.g. Grand Hyatt Erawan, Bangkok"
            />
          </Field>
        )}
        {format !== "IN_PERSON" && (
          <Field label="Online link" htmlFor="onlineUrl" error={e.onlineUrl} required className="sm:col-span-2">
            <Input id="onlineUrl" name="onlineUrl" defaultValue={defaults.onlineUrl} placeholder="Teams / Zoom link" />
          </Field>
        )}
        <Field label="Firm speakers" htmlFor="speakerIds" error={e.speakerIds}>
          <Picker id="speakerIds" name="speakerIds" kind="lawyer" multiple defaultValue={defaults.speakers} />
        </Field>
        <Field label="External speakers" htmlFor="externalSpeakers" error={e.externalSpeakers}>
          <Input
            id="externalSpeakers"
            name="externalSpeakers"
            defaultValue={defaults.externalSpeakers}
            placeholder="Names and organisations"
          />
        </Field>
        <Field label="Event owner (BD)" htmlFor="ownerId" error={e.ownerId}>
          <Picker id="ownerId" name="ownerId" kind="user" defaultValue={defaults.owner ? [defaults.owner] : []} />
        </Field>
        <Field label="Budget" htmlFor="budget" error={e.budget}>
          <div className="flex gap-2">
            <Input id="budget" name="budget" inputMode="decimal" defaultValue={defaults.budget} />
            <NativeSelect
              name="currency"
              aria-label="Currency"
              defaultValue={defaults.currency}
              className="w-24 shrink-0"
            >
              {CURRENCIES.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </NativeSelect>
          </div>
        </Field>
        <Field label="Actual cost" htmlFor="actualCost" error={e.actualCost}>
          <Input id="actualCost" name="actualCost" inputMode="decimal" defaultValue={defaults.actualCost} />
        </Field>
      </div>
      <PracticeAreaCheckboxes options={practiceAreas} defaultValue={defaults.practiceAreaIds} />
      <Field label="Notes" htmlFor="notes" error={e.notes}>
        <Textarea id="notes" name="notes" defaultValue={defaults.notes} rows={3} />
      </Field>
      <div>
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : submitLabel}
        </Button>
      </div>
    </form>
  );
}
