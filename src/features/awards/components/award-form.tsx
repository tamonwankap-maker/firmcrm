"use client";

import { useRef } from "react";
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
import { AWARD_STATUSES, AWARD_STATUS_LABELS, type AwardStatusKey } from "../../labels";

export interface AwardFormValues {
  name: string;
  organiser: string;
  category: string;
  year: string;
  deadline: string;
  owner: PickerOption | null;
  practiceAreaIds: string[];
  status: AwardStatusKey;
  notes: string;
}

export function AwardForm({
  action,
  defaults,
  practiceAreas,
  submitLabel,
  resetOnSuccess,
}: {
  action: (prev: ActionResult | null, form: FormData) => Promise<ActionResult>;
  defaults: AwardFormValues;
  practiceAreas: { id: string; name: string }[];
  submitLabel: string;
  resetOnSuccess?: boolean;
}) {
  const ref = useRef<HTMLFormElement>(null);
  const [state, onSubmit, pending] = useFormAction(async (prev: ActionResult | null, form: FormData) => {
    const res = await action(prev, form);
    if (res.ok && resetOnSuccess) ref.current?.reset();
    return res;
  });
  const e = fieldErrors(state);
  return (
    <form ref={ref} onSubmit={onSubmit} className="flex flex-col gap-4">
      <FormStatus state={state} />
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Award" htmlFor="name" error={e.name} required>
          <Input
            id="name"
            name="name"
            defaultValue={defaults.name}
            required
            placeholder="e.g. ALB Thailand Law Awards"
          />
        </Field>
        <Field label="Category" htmlFor="category" error={e.category} required>
          <Input
            id="category"
            name="category"
            defaultValue={defaults.category}
            required
            placeholder="e.g. M&A Deal of the Year"
          />
        </Field>
        <Field label="Organiser" htmlFor="organiser" error={e.organiser}>
          <Input id="organiser" name="organiser" defaultValue={defaults.organiser} />
        </Field>
        <Field label="Year" htmlFor="year" error={e.year} required>
          <Input id="year" name="year" type="number" min={2000} max={2100} defaultValue={defaults.year} required />
        </Field>
        <Field label="Entry deadline" htmlFor="deadline" error={e.deadline}>
          <Input id="deadline" name="deadline" type="date" defaultValue={defaults.deadline} />
        </Field>
        <Field label="Status" htmlFor="status" error={e.status}>
          <NativeSelect id="status" name="status" defaultValue={defaults.status}>
            {AWARD_STATUSES.map((s) => (
              <option key={s} value={s}>
                {AWARD_STATUS_LABELS[s]}
              </option>
            ))}
          </NativeSelect>
        </Field>
        <Field label="Owner" htmlFor="ownerId" error={e.ownerId} help="Defaults to you">
          <Picker id="ownerId" name="ownerId" kind="user" defaultValue={defaults.owner ? [defaults.owner] : []} />
        </Field>
      </div>
      <PracticeAreaCheckboxes options={practiceAreas} defaultValue={defaults.practiceAreaIds} />
      <Field label="Notes" htmlFor="notes" error={e.notes}>
        <Textarea id="notes" name="notes" defaultValue={defaults.notes} rows={2} />
      </Field>
      <div>
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : submitLabel}
        </Button>
      </div>
    </form>
  );
}
