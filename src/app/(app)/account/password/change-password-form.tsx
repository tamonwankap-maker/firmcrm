"use client";

import { useFormAction } from "@/components/forms/use-form-action";
import { changePasswordAction } from "@/features/auth/actions";
import { Field } from "@/components/forms/field";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function ChangePasswordForm() {
  const [state, action, pending] = useFormAction(changePasswordAction);
  const errors = state && !state.ok ? state.fieldErrors : undefined;
  return (
    <form onSubmit={action} className="flex flex-col gap-4">
      {state && !state.ok && <Alert variant="destructive">{state.error}</Alert>}
      <Field label="Current password" htmlFor="currentPassword" error={errors?.currentPassword} required>
        <Input id="currentPassword" name="currentPassword" type="password" autoComplete="current-password" required />
      </Field>
      <Field
        label="New password"
        htmlFor="newPassword"
        error={errors?.newPassword}
        help="At least 12 characters, with a letter and a number."
        required
      >
        <Input id="newPassword" name="newPassword" type="password" autoComplete="new-password" required />
      </Field>
      <Field label="Confirm new password" htmlFor="confirmPassword" error={errors?.confirmPassword} required>
        <Input id="confirmPassword" name="confirmPassword" type="password" autoComplete="new-password" required />
      </Field>
      <Button type="submit" disabled={pending}>
        {pending ? "Saving…" : "Change password"}
      </Button>
    </form>
  );
}
