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
import { ACTIVITY_TYPES, ACTIVITY_TYPE_LABELS, CURRENCIES, type ActivityTypeKey } from "../../labels";

export interface ActivityFormValues {
  type: ActivityTypeKey | "";
  date: string; // YYYY-MM-DD
  organisation: PickerOption | null;
  opportunity: PickerOption | null;
  contacts: PickerOption[];
  attendees: PickerOption[];
  practiceAreaIds: string[];
  summary: string;
  nextAction: string;
  nextActionDue: string;
  owner: PickerOption | null;
  giftValue: string;
  giftCurrency: "THB" | "USD";
}

export function ActivityForm({
  action,
  defaults,
  practiceAreas,
  submitLabel,
  returnTo,
}: {
  action: (prev: ActionResult | null, form: FormData) => Promise<ActionResult>;
  defaults: ActivityFormValues;
  practiceAreas: { id: string; name: string }[];
  submitLabel: string;
  returnTo?: string;
}) {
  const [state, onSubmit, pending] = useFormAction(action);
  const [type, setType] = useState(defaults.type);
  const [org, setOrg] = useState<PickerOption | null>(defaults.organisation);
  const e = fieldErrors(state);

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-5">
      {returnTo && <input type="hidden" name="returnTo" value={returnTo} />}
      <FormStatus state={state} />
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Type" htmlFor="type" error={e.type} required>
          <NativeSelect
            id="type"
            name="type"
            value={type}
            onChange={(ev) => setType(ev.target.value as ActivityTypeKey)}
            required
          >
            <option value="">Choose…</option>
            {ACTIVITY_TYPES.map((t) => (
              <option key={t} value={t}>
                {ACTIVITY_TYPE_LABELS[t]}
              </option>
            ))}
          </NativeSelect>
        </Field>
        <Field label="Date" htmlFor="date" error={e.date} required>
          <Input id="date" name="date" type="date" defaultValue={defaults.date} required />
        </Field>
        <Field label="Owner" htmlFor="ownerId" error={e.ownerId} help="Defaults to you">
          <Picker id="ownerId" name="ownerId" kind="user" defaultValue={defaults.owner ? [defaults.owner] : []} />
        </Field>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          label="Organisation"
          htmlFor="organisationId"
          error={e.organisationId}
          help="Filled from the first contact if left empty"
        >
          <Picker
            id="organisationId"
            name="organisationId"
            kind="organisation"
            defaultValue={defaults.organisation ? [defaults.organisation] : []}
            onChange={(sel) => setOrg(sel[0] ?? null)}
          />
        </Field>
        <Field label="Client contacts" htmlFor="contactIds" error={e.contactIds}>
          <Picker
            id="contactIds"
            name="contactIds"
            kind="contact"
            multiple
            defaultValue={defaults.contacts}
            organisationId={org?.id}
            placeholder={org ? `Search contacts at ${org.label}…` : "Search contacts…"}
          />
        </Field>
        <Field
          label="Opportunity"
          htmlFor="opportunityId"
          error={e.opportunityId}
          help="Optional — link to a pipeline opportunity"
        >
          <Picker
            id="opportunityId"
            name="opportunityId"
            kind="opportunity"
            defaultValue={defaults.opportunity ? [defaults.opportunity] : []}
            organisationId={org?.id}
          />
        </Field>
        <Field label="Firm attendees" htmlFor="attendeeIds" error={e.attendeeIds}>
          <Picker id="attendeeIds" name="attendeeIds" kind="lawyer" multiple defaultValue={defaults.attendees} />
        </Field>
        {type === "GIFT" && (
          <Field label="Gift value" htmlFor="giftValue" error={e.giftValue} help="For the gift register">
            <div className="flex gap-2">
              <Input id="giftValue" name="giftValue" inputMode="decimal" defaultValue={defaults.giftValue} />
              <NativeSelect
                name="giftCurrency"
                aria-label="Currency"
                defaultValue={defaults.giftCurrency}
                className="w-24"
              >
                {CURRENCIES.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </NativeSelect>
            </div>
          </Field>
        )}
      </div>
      <Field label="Summary" htmlFor="summary" error={e.summary} required>
        <Textarea id="summary" name="summary" defaultValue={defaults.summary} rows={4} required />
      </Field>
      <div className="grid gap-4 sm:grid-cols-[1fr_12rem]">
        <Field label="Next action" htmlFor="nextAction" error={e.nextAction}>
          <Input
            id="nextAction"
            name="nextAction"
            defaultValue={defaults.nextAction}
            placeholder="e.g. Send fee proposal"
          />
        </Field>
        <Field label="Due" htmlFor="nextActionDue" error={e.nextActionDue}>
          <Input id="nextActionDue" name="nextActionDue" type="date" defaultValue={defaults.nextActionDue} />
        </Field>
      </div>
      <PracticeAreaCheckboxes options={practiceAreas} defaultValue={defaults.practiceAreaIds} />
      <div>
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : submitLabel}
        </Button>
      </div>
    </form>
  );
}
