"use client";

import { useOptimistic, useTransition } from "react";
import { toast } from "sonner";
import { Checkbox } from "@/components/ui/checkbox";
import { setNextActionDoneAction } from "../actions";

export function NextActionToggle({ id, done, disabled }: { id: string; done: boolean; disabled?: boolean }) {
  const [pending, start] = useTransition();
  // Show the new state immediately; it settles when the server re-renders.
  const [shown, setShown] = useOptimistic(done);
  return (
    <Checkbox
      aria-label={shown ? "Mark next action not done" : "Mark next action done"}
      checked={shown}
      disabled={disabled || pending}
      onChange={(e) => {
        const next = e.target.checked;
        start(async () => {
          setShown(next);
          const res = await setNextActionDoneAction(id, next);
          if (!res.ok) toast.error(res.error);
        });
      }}
    />
  );
}
