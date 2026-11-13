"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Archive, ArchiveRestore } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ActionResult } from "@/server/actions/result";

export function ArchiveButton({
  archived,
  action,
  label = "record",
}: {
  archived: boolean;
  action: (archive: boolean) => Promise<ActionResult>;
  label?: string;
}) {
  const [pending, start] = useTransition();
  return (
    <Button
      variant="outline"
      disabled={pending}
      onClick={() => {
        if (!archived && !confirm(`Archive this ${label}? It will be hidden from lists but can be restored.`)) return;
        start(async () => {
          const res = await action(!archived);
          if (res.ok) toast.success(res.message ?? "Done");
          else toast.error(res.error);
        });
      }}
    >
      {archived ? <ArchiveRestore /> : <Archive />}
      {archived ? "Restore" : "Archive"}
    </Button>
  );
}
