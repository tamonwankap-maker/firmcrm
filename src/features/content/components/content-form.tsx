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
import {
  CONTENT_STATUSES,
  CONTENT_STATUS_LABELS,
  CONTENT_TYPES,
  CONTENT_TYPE_LABELS,
  type ContentStatusKey,
  type ContentTypeKey,
} from "../../labels";

export interface ContentFormValues {
  title: string;
  type: ContentTypeKey | "";
  channel: string;
  status: ContentStatusKey;
  publishDate: string;
  url: string;
  engagementNotes: string;
  authors: PickerOption[];
  practiceAreaIds: string[];
}

export function ContentForm({
  action,
  defaults,
  practiceAreas,
  submitLabel,
  resetOnSuccess,
}: {
  action: (prev: ActionResult | null, form: FormData) => Promise<ActionResult>;
  defaults: ContentFormValues;
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
        <Field label="Title" htmlFor="title" error={e.title} required className="sm:col-span-2">
          <Input
            id="title"
            name="title"
            defaultValue={defaults.title}
            required
            placeholder="e.g. New Thai foreign business licence rules — client alert"
          />
        </Field>
        <Field label="Type" htmlFor="type" error={e.type} required>
          <NativeSelect id="type" name="type" defaultValue={defaults.type} required>
            <option value="">Choose…</option>
            {CONTENT_TYPES.map((t) => (
              <option key={t} value={t}>
                {CONTENT_TYPE_LABELS[t]}
              </option>
            ))}
          </NativeSelect>
        </Field>
        <Field label="Authors / speakers" htmlFor="authorIds" error={e.authorIds} required>
          <Picker id="authorIds" name="authorIds" kind="lawyer" multiple defaultValue={defaults.authors} />
        </Field>
        <Field label="Channel" htmlFor="channel" error={e.channel} help="e.g. Firm website, Bangkok Post, LinkedIn">
          <Input id="channel" name="channel" defaultValue={defaults.channel} />
        </Field>
        <Field label="Status" htmlFor="contentStatus" error={e.status}>
          <NativeSelect id="contentStatus" name="status" defaultValue={defaults.status}>
            {CONTENT_STATUSES.map((s) => (
              <option key={s} value={s}>
                {CONTENT_STATUS_LABELS[s]}
              </option>
            ))}
          </NativeSelect>
        </Field>
        <Field label="Publish date" htmlFor="publishDate" error={e.publishDate}>
          <Input id="publishDate" name="publishDate" type="date" defaultValue={defaults.publishDate} />
        </Field>
        <Field label="Link" htmlFor="url" error={e.url} className="sm:col-span-2">
          <Input id="url" name="url" defaultValue={defaults.url} placeholder="https://…" />
        </Field>
      </div>
      <PracticeAreaCheckboxes options={practiceAreas} defaultValue={defaults.practiceAreaIds} />
      <Field
        label="Engagement notes"
        htmlFor="engagementNotes"
        error={e.engagementNotes}
        help="Views, reactions, client enquiries it generated…"
      >
        <Textarea id="engagementNotes" name="engagementNotes" defaultValue={defaults.engagementNotes} rows={2} />
      </Field>
      <div>
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : submitLabel}
        </Button>
      </div>
    </form>
  );
}
