"use client";

import { useState } from "react";
import { useFormAction } from "@/components/forms/use-form-action";
import { Field } from "@/components/forms/field";
import { FormStatus, fieldErrors } from "@/components/forms/form-shell";
import { Picker } from "@/components/forms/picker";
import { PracticeAreaCheckboxes } from "@/components/forms/practice-area-checkboxes";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import type { ActionResult } from "@/server/actions/result";
import type { PickerOption } from "@/features/pickers/actions";
import { CURRENCIES } from "../../labels";

export interface MatterFormValues {
  title: string;
  clientOrganisation: PickerOption | null;
  clientDisplayName: string;
  anonymised: boolean;
  practiceAreaIds: string[];
  value: string;
  currency: "THB" | "USD";
  year: string;
  publishable: boolean;
  confidential: boolean;
  team: PickerOption[];
  description: string;
}

export function MatterForm({
  action,
  defaults,
  practiceAreas,
  submitLabel,
}: {
  action: (prev: ActionResult | null, form: FormData) => Promise<ActionResult>;
  defaults: MatterFormValues;
  practiceAreas: { id: string; name: string }[];
  submitLabel: string;
}) {
  const [state, onSubmit, pending] = useFormAction(action);
  const [anonymised, setAnonymised] = useState(defaults.anonymised);
  const [confidential, setConfidential] = useState(defaults.confidential);
  const e = fieldErrors(state);
  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-5">
      <FormStatus state={state} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Matter title" htmlFor="title" error={e.title} required help="As it would appear in a submission">
          <Input id="title" name="title" defaultValue={defaults.title} required maxLength={300} />
        </Field>
        <Field label="Year" htmlFor="year" error={e.year} required>
          <Input
            id="year"
            name="year"
            type="number"
            min={1950}
            max={2100}
            defaultValue={defaults.year}
            required
            className="max-w-32"
          />
        </Field>
        <Field label="Client" htmlFor="clientOrganisationId" error={e.clientOrganisationId}>
          <Picker
            id="clientOrganisationId"
            name="clientOrganisationId"
            kind="organisation"
            defaultValue={defaults.clientOrganisation ? [defaults.clientOrganisation] : []}
          />
        </Field>
        <Field
          label={anonymised ? "Client description (shown instead of the name)" : "Client description (optional)"}
          htmlFor="clientDisplayName"
          error={e.clientDisplayName}
          required={anonymised}
        >
          <Input
            id="clientDisplayName"
            name="clientDisplayName"
            defaultValue={defaults.clientDisplayName}
            placeholder="e.g. a Japanese automotive group"
          />
        </Field>
        <Field label="Deal / matter value" htmlFor="value" error={e.value}>
          <div className="flex gap-2">
            <Input id="value" name="value" inputMode="decimal" defaultValue={defaults.value} />
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
        <Field
          label="Team"
          htmlFor="teamIds"
          error={e.teamIds}
          help="People named here can see it if it is confidential"
        >
          <Picker id="teamIds" name="teamIds" kind="lawyer" multiple defaultValue={defaults.team} />
        </Field>
      </div>
      <Field label="Description" htmlFor="description" error={e.description} required>
        <Textarea id="description" name="description" defaultValue={defaults.description} rows={6} required />
      </Field>
      <PracticeAreaCheckboxes options={practiceAreas} defaultValue={defaults.practiceAreaIds} />
      {e.practiceAreaIds && <p className="text-destructive -mt-3 text-xs">{e.practiceAreaIds[0]}</p>}
      <fieldset className="flex flex-col gap-2 rounded-md border p-3 text-sm">
        <legend className="px-1 font-medium">Use in submissions</legend>
        <label className="flex items-start gap-2">
          <Checkbox
            name="anonymised"
            checked={anonymised}
            onChange={(ev) => setAnonymised(ev.target.checked)}
            className="mt-0.5"
          />
          <span>
            Anonymised{" "}
            <span className="text-muted-foreground block text-xs">
              Show the client description instead of the client’s name.
            </span>
          </span>
        </label>
        <label className="flex items-start gap-2">
          <Checkbox
            name="publishable"
            defaultChecked={defaults.publishable}
            disabled={confidential}
            className="mt-0.5"
          />
          <span>
            Publishable{" "}
            <span className="text-muted-foreground block text-xs">May be named in published directory editorial.</span>
            {e.publishable && <span className="text-destructive block text-xs">{e.publishable[0]}</span>}
          </span>
        </label>
        <label className="flex items-start gap-2">
          <Checkbox
            name="confidential"
            checked={confidential}
            onChange={(ev) => setConfidential(ev.target.checked)}
            className="mt-0.5"
          />
          <span>
            Confidential{" "}
            <span className="text-muted-foreground block text-xs">
              Only the Head of BD and the team can see it. Cannot be publishable.
            </span>
            {e.confidential && <span className="text-destructive block text-xs">{e.confidential[0]}</span>}
          </span>
        </label>
      </fieldset>
      <div>
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : submitLabel}
        </Button>
      </div>
    </form>
  );
}
