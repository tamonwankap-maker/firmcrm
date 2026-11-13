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
import { SUBMISSION_STATUSES, SUBMISSION_STATUS_LABELS, type SubmissionStatusKey } from "../../labels";

export interface SubmissionFormValues {
  directoryId: string;
  year: string;
  practiceAreaId: string;
  deadline: string;
  owner: PickerOption | null;
  partnerReviewer: PickerOption | null;
  status: SubmissionStatusKey;
  resultTier: string;
  rankedLawyers: PickerOption[];
  matters: PickerOption[];
  notes: string;
}

export function SubmissionForm({
  action,
  defaults,
  directories,
  practiceAreas,
  mode,
}: {
  action: (prev: ActionResult | null, form: FormData) => Promise<ActionResult>;
  defaults: SubmissionFormValues;
  directories: { id: string; name: string }[];
  practiceAreas: { id: string; name: string }[];
  mode: "create" | "edit";
}) {
  const [state, onSubmit, pending] = useFormAction(action);
  const e = fieldErrors(state);
  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <FormStatus state={state} />
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Directory" htmlFor="directoryId" error={e.directoryId} required>
          <NativeSelect id="directoryId" name="directoryId" defaultValue={defaults.directoryId} required>
            <option value="">Choose…</option>
            {directories.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </NativeSelect>
        </Field>
        <Field label="Guide year" htmlFor="year" error={e.year} required>
          <Input id="year" name="year" type="number" min={2000} max={2100} defaultValue={defaults.year} required />
        </Field>
        <Field label="Practice area" htmlFor="practiceAreaId" error={e.practiceAreaId} required>
          <NativeSelect id="practiceAreaId" name="practiceAreaId" defaultValue={defaults.practiceAreaId} required>
            <option value="">Choose…</option>
            {practiceAreas.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </NativeSelect>
        </Field>
        <Field label="Submission deadline" htmlFor="deadline" error={e.deadline}>
          <Input id="deadline" name="deadline" type="date" defaultValue={defaults.deadline} />
        </Field>
        <Field label="Status" htmlFor="status" error={e.status}>
          <NativeSelect id="status" name="status" defaultValue={defaults.status}>
            {SUBMISSION_STATUSES.map((s) => (
              <option key={s} value={s}>
                {SUBMISSION_STATUS_LABELS[s]}
              </option>
            ))}
          </NativeSelect>
        </Field>
        <Field label="Result (tier / band)" htmlFor="resultTier" error={e.resultTier} help="e.g. Tier 1, Band 2">
          <Input id="resultTier" name="resultTier" defaultValue={defaults.resultTier} />
        </Field>
        <Field
          label="Owner (BD)"
          htmlFor="ownerId"
          error={e.ownerId}
          help={mode === "create" ? "Defaults to you" : undefined}
        >
          <Picker id="ownerId" name="ownerId" kind="user" defaultValue={defaults.owner ? [defaults.owner] : []} />
        </Field>
        <Field label="Partner reviewer" htmlFor="partnerReviewerId" error={e.partnerReviewerId}>
          <Picker
            id="partnerReviewerId"
            name="partnerReviewerId"
            kind="user"
            defaultValue={defaults.partnerReviewer ? [defaults.partnerReviewer] : []}
          />
        </Field>
        <Field label="Ranked / nominated lawyers" htmlFor="rankedLawyerIds" error={e.rankedLawyerIds}>
          <Picker
            id="rankedLawyerIds"
            name="rankedLawyerIds"
            kind="lawyer"
            multiple
            defaultValue={defaults.rankedLawyers}
          />
        </Field>
      </div>
      <Field label="Representative matters" htmlFor="matterIds" error={e.matterIds}>
        <Picker
          id="matterIds"
          name="matterIds"
          kind="matter"
          multiple
          defaultValue={defaults.matters}
          placeholder="Search matters…"
        />
      </Field>
      <Field label="Notes" htmlFor="notes" error={e.notes}>
        <Textarea id="notes" name="notes" defaultValue={defaults.notes} rows={3} />
      </Field>
      <div>
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : mode === "create" ? "Create submission" : "Save submission"}
        </Button>
      </div>
    </form>
  );
}
