"use client";

import { useFormAction } from "@/components/forms/use-form-action";
import { Field } from "@/components/forms/field";
import { FormStatus, fieldErrors } from "@/components/forms/form-shell";
import { Picker } from "@/components/forms/picker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import type { ActionResult } from "@/server/actions/result";
import type { PickerOption } from "@/features/pickers/actions";
import {
  PITCH_FORMATS,
  PITCH_FORMAT_LABELS,
  PITCH_STATUSES,
  PITCH_STATUS_LABELS,
  type PitchStatusKey,
} from "../../labels";

export interface PitchFormValues {
  opportunity: PickerOption | null;
  deadline: string; // YYYY-MM-DDTHH:mm (Bangkok)
  owner: PickerOption | null;
  format: (typeof PITCH_FORMATS)[number];
  status: PitchStatusKey;
  notes: string;
}

export function PitchForm({
  action,
  defaults,
  mode,
}: {
  action: (prev: ActionResult | null, form: FormData) => Promise<ActionResult>;
  defaults: PitchFormValues;
  mode: "create" | "edit";
}) {
  const [state, onSubmit, pending] = useFormAction(action);
  const e = fieldErrors(state);
  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <FormStatus state={state} />
      <div className="grid gap-4 sm:grid-cols-2">
        {mode === "create" && (
          <Field label="Opportunity" htmlFor="opportunityId" error={e.opportunityId} required>
            <Picker
              id="opportunityId"
              name="opportunityId"
              kind="opportunity"
              defaultValue={defaults.opportunity ? [defaults.opportunity] : []}
            />
          </Field>
        )}
        <Field label="Deadline (Bangkok time)" htmlFor="deadline" error={e.deadline} required>
          <Input id="deadline" name="deadline" type="datetime-local" defaultValue={defaults.deadline} required />
        </Field>
        <Field label="Owner" htmlFor="ownerId" error={e.ownerId} help="Defaults to you">
          <Picker id="ownerId" name="ownerId" kind="user" defaultValue={defaults.owner ? [defaults.owner] : []} />
        </Field>
        <Field label="Format" htmlFor="format" error={e.format}>
          <NativeSelect id="format" name="format" defaultValue={defaults.format}>
            {PITCH_FORMATS.map((f) => (
              <option key={f} value={f}>
                {PITCH_FORMAT_LABELS[f]}
              </option>
            ))}
          </NativeSelect>
        </Field>
        <Field label="Status" htmlFor="status" error={e.status}>
          <NativeSelect id="status" name="status" defaultValue={defaults.status}>
            {PITCH_STATUSES.map((s) => (
              <option key={s} value={s}>
                {PITCH_STATUS_LABELS[s]}
              </option>
            ))}
          </NativeSelect>
        </Field>
      </div>
      <Field label="Notes" htmlFor="notes" error={e.notes}>
        <Textarea
          id="notes"
          name="notes"
          defaultValue={defaults.notes}
          rows={3}
          placeholder="e.g. RFP requires Thai and English versions; 20-page limit"
        />
      </Field>
      <div>
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : mode === "create" ? "Create pitch" : "Save pitch"}
        </Button>
      </div>
    </form>
  );
}
