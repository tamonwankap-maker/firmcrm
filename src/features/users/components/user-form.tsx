"use client";

import { useFormAction } from "@/components/forms/use-form-action";
import { Field } from "@/components/forms/field";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import type { ActionResult } from "@/server/actions/result";
import { ROLES } from "../schema";
import { ROLE_DESCRIPTIONS, ROLE_LABELS } from "../labels";

export interface UserFormValues {
  name: string;
  email: string;
  role: (typeof ROLES)[number];
  title: string;
  practiceAreaIds: string[];
  canLogin: boolean;
  active: boolean;
}

type FormAction<T> = (prev: ActionResult<T> | null, form: FormData) => Promise<ActionResult<T>>;

export function UserForm<T>({
  action,
  defaults,
  practiceAreas,
  mode,
  onSuccess,
}: {
  action: FormAction<T>;
  defaults?: UserFormValues;
  practiceAreas: { id: string; name: string }[];
  mode: "create" | "edit";
  onSuccess?: (data: T | undefined) => React.ReactNode;
}) {
  const [state, formAction, pending] = useFormAction(action);
  const errors = state && !state.ok ? state.fieldErrors : undefined;

  if (state?.ok && onSuccess) return <>{onSuccess(state.data)}</>;

  return (
    <form onSubmit={formAction} className="flex flex-col gap-5">
      {state && !state.ok && <Alert variant="destructive">{state.error}</Alert>}
      {state?.ok && state.message && <Alert variant="success">{state.message}</Alert>}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Full name" htmlFor="name" error={errors?.name} required>
          <Input id="name" name="name" defaultValue={defaults?.name} required maxLength={200} />
        </Field>
        <Field label="Email" htmlFor="email" error={errors?.email} required>
          <Input id="email" name="email" type="email" defaultValue={defaults?.email} required />
        </Field>
        <Field label="Title" htmlFor="title" error={errors?.title} help="e.g. Partner, Senior Associate, BD Manager">
          <Input id="title" name="title" defaultValue={defaults?.title} maxLength={200} />
        </Field>
        <Field label="Role" htmlFor="role" error={errors?.role} required>
          <NativeSelect id="role" name="role" defaultValue={defaults?.role ?? "VIEWER"}>
            {ROLES.map((r) => (
              <option key={r} value={r}>
                {ROLE_LABELS[r]} — {ROLE_DESCRIPTIONS[r]}
              </option>
            ))}
          </NativeSelect>
        </Field>
      </div>

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 text-sm font-medium">Practice areas</legend>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {practiceAreas.map((pa) => (
            <label key={pa.id} className="flex items-center gap-2 text-sm">
              <Checkbox
                name="practiceAreaIds"
                value={pa.id}
                defaultChecked={defaults?.practiceAreaIds.includes(pa.id)}
              />
              {pa.name}
            </label>
          ))}
        </div>
      </fieldset>

      <div className="flex flex-col gap-2">
        <label className="flex items-center gap-2 text-sm">
          <Checkbox name="canLogin" defaultChecked={defaults?.canLogin ?? true} />
          Can sign in to the CRM
          <span className="text-muted-foreground text-xs">
            (untick for lawyers recorded only as speakers, authors, ranked lawyers…)
          </span>
        </label>
        {mode === "edit" && (
          <label className="flex items-center gap-2 text-sm">
            <Checkbox name="active" defaultChecked={defaults?.active ?? true} />
            Active{" "}
            <span className="text-muted-foreground text-xs">
              (untick when someone leaves the firm — their history is kept)
            </span>
          </label>
        )}
      </div>

      <div>
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : mode === "create" ? "Create user" : "Save changes"}
        </Button>
      </div>
    </form>
  );
}
