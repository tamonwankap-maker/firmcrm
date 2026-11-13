"use client";

import { useFormAction } from "@/components/forms/use-form-action";
import { resetPasswordAction } from "@/features/users/actions";
import { TempPasswordNotice } from "@/features/users/components/temp-password-notice";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

export function ResetPasswordButton({ userId }: { userId: string }) {
  const [state, onSubmit, pending] = useFormAction(
    (prev: Awaited<ReturnType<typeof resetPasswordAction>> | null) => resetPasswordAction(userId, prev),
    {
      confirm: "Reset this user's password? They will be signed out everywhere.",
    },
  );
  if (state?.ok && state.data)
    return <TempPasswordNotice intro="Password reset. New temporary password:" password={state.data.tempPassword} />;
  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-3">
      {state && !state.ok && <Alert variant="destructive">{state.error}</Alert>}
      <div>
        <Button type="submit" variant="outline" disabled={pending}>
          {pending ? "Resetting…" : "Reset password"}
        </Button>
      </div>
    </form>
  );
}
