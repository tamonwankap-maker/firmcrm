"use client";

import { Alert } from "@/components/ui/alert";
import type { ActionResult } from "@/server/actions/result";

/** Error / success banner for a form's ActionResult. */
export function FormStatus({ state }: { state: ActionResult<unknown> | null }) {
  if (!state) return null;
  if (!state.ok) return <Alert variant="destructive">{state.error}</Alert>;
  if (state.message) return <Alert variant="success">{state.message}</Alert>;
  return null;
}

export function fieldErrors(state: ActionResult<unknown> | null) {
  return state && !state.ok ? (state.fieldErrors ?? {}) : {};
}
