"use client";

import { useFormAction } from "@/components/forms/use-form-action";
import { Field } from "@/components/forms/field";
import { FormStatus, fieldErrors } from "@/components/forms/form-shell";
import { Picker } from "@/components/forms/picker";
import { DuplicateNotice } from "@/components/records/duplicate-notice";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import type { ActionResult } from "@/server/actions/result";
import type { PickerOption } from "@/features/pickers/actions";
import { LANGUAGES, LANGUAGE_LABELS, STRENGTH_LABELS } from "../../labels";

export interface ContactFormValues {
  nameEn: string;
  nameTh: string;
  title: string;
  organisation: PickerOption | null;
  email: string;
  phone: string;
  linkedinUrl: string;
  owners: PickerOption[];
  relationshipStrength: number;
  preferredLanguage: "EN" | "TH" | "OTHER";
  tags: string;
  notes: string;
}

export function ContactForm({
  action,
  defaults,
  submitLabel,
  existingTags,
  canCreateTags,
}: {
  action: (prev: ActionResult | null, form: FormData) => Promise<ActionResult>;
  defaults: ContactFormValues;
  submitLabel: string;
  existingTags: string[];
  canCreateTags: boolean;
}) {
  const [state, onSubmit, pending] = useFormAction(action);
  const e = fieldErrors(state);
  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-5">
      <FormStatus state={state} />
      {state && !state.ok && state.duplicates && <DuplicateNotice matches={state.duplicates} />}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Name (English)" htmlFor="nameEn" error={e.nameEn} required>
          <Input id="nameEn" name="nameEn" defaultValue={defaults.nameEn} required maxLength={200} />
        </Field>
        <Field label="Name (Thai) / ชื่อภาษาไทย" htmlFor="nameTh" error={e.nameTh}>
          <Input id="nameTh" name="nameTh" lang="th" defaultValue={defaults.nameTh} maxLength={200} />
        </Field>
        <Field label="Job title" htmlFor="title" error={e.title}>
          <Input id="title" name="title" defaultValue={defaults.title} placeholder="e.g. General Counsel" />
        </Field>
        <Field label="Organisation" htmlFor="organisationId" error={e.organisationId}>
          <Picker
            id="organisationId"
            name="organisationId"
            kind="organisation"
            defaultValue={defaults.organisation ? [defaults.organisation] : []}
          />
        </Field>
        <Field label="Email" htmlFor="email" error={e.email}>
          <Input id="email" name="email" type="email" defaultValue={defaults.email} />
        </Field>
        <Field label="Phone" htmlFor="phone" error={e.phone}>
          <Input id="phone" name="phone" type="tel" defaultValue={defaults.phone} placeholder="+66 …" />
        </Field>
        <Field label="LinkedIn" htmlFor="linkedinUrl" error={e.linkedinUrl}>
          <Input
            id="linkedinUrl"
            name="linkedinUrl"
            defaultValue={defaults.linkedinUrl}
            placeholder="linkedin.com/in/…"
          />
        </Field>
        <Field label="Relationship owners" htmlFor="ownerIds" error={e.ownerIds} help="Defaults to you">
          <Picker id="ownerIds" name="ownerIds" kind="user" multiple defaultValue={defaults.owners} />
        </Field>
        <Field label="Relationship strength" htmlFor="relationshipStrength" error={e.relationshipStrength}>
          <NativeSelect
            id="relationshipStrength"
            name="relationshipStrength"
            defaultValue={String(defaults.relationshipStrength)}
          >
            {[1, 2, 3, 4, 5].map((n) => (
              <option key={n} value={n}>
                {STRENGTH_LABELS[n]}
              </option>
            ))}
          </NativeSelect>
        </Field>
        <Field label="Preferred language" htmlFor="preferredLanguage" error={e.preferredLanguage}>
          <NativeSelect id="preferredLanguage" name="preferredLanguage" defaultValue={defaults.preferredLanguage}>
            {LANGUAGES.map((l) => (
              <option key={l} value={l}>
                {LANGUAGE_LABELS[l]}
              </option>
            ))}
          </NativeSelect>
        </Field>
      </div>
      <Field
        label="Tags"
        htmlFor="tags"
        error={e.tags}
        help={
          canCreateTags
            ? "Comma-separated. New tags are created automatically."
            : "Comma-separated, from the existing tag list."
        }
      >
        <Input
          id="tags"
          name="tags"
          defaultValue={defaults.tags}
          list="tag-options"
          placeholder="e.g. GC, Japan desk"
        />
        <datalist id="tag-options">
          {existingTags.map((t) => (
            <option key={t} value={t} />
          ))}
        </datalist>
      </Field>
      <Field label="Notes" htmlFor="notes" error={e.notes}>
        <Textarea id="notes" name="notes" defaultValue={defaults.notes} rows={4} />
      </Field>
      <div>
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : submitLabel}
        </Button>
      </div>
    </form>
  );
}
