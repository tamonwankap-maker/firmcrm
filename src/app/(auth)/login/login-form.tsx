"use client";

import { useFormAction } from "@/components/forms/use-form-action";
import { loginAction } from "@/features/auth/actions";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function LoginForm({ callbackUrl, passwordChanged }: { callbackUrl: string; passwordChanged: boolean }) {
  const [state, action, pending] = useFormAction(loginAction);
  return (
    <form onSubmit={action} className="flex flex-col gap-4">
      <input type="hidden" name="callbackUrl" value={callbackUrl} />
      {passwordChanged && !state && <Alert variant="success">Password changed. Please sign in again.</Alert>}
      {state && !state.ok && <Alert variant="destructive">{state.error}</Alert>}
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="email">Email</Label>
        <Input id="email" name="email" type="email" autoComplete="username" required autoFocus />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="password">Password</Label>
        <Input id="password" name="password" type="password" autoComplete="current-password" required />
      </div>
      <Button type="submit" disabled={pending}>
        {pending ? "Signing in…" : "Sign in"}
      </Button>
      <p className="text-muted-foreground text-xs">Forgotten your password? Ask the Head of BD to reset it.</p>
    </form>
  );
}
