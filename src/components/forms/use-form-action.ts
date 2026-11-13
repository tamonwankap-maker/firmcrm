"use client";

import { startTransition, useActionState, type FormEvent } from "react";

/**
 * Like useActionState, but submits via onSubmit so React does NOT reset the form after the action.
 * Users keep what they typed when the server returns validation errors.
 *
 *   const [state, onSubmit, pending] = useFormAction(saveThing);
 *   <form onSubmit={onSubmit}>…</form>
 */
export function useFormAction<S>(
  action: (prev: S | null, form: FormData) => Promise<S>,
  opts: { confirm?: string } = {},
) {
  const [state, dispatch, pending] = useActionState(action, null);
  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (opts.confirm && !window.confirm(opts.confirm)) return;
    const form = new FormData(e.currentTarget);
    startTransition(() => dispatch(form));
  };
  return [state, onSubmit, pending] as const;
}
