"use client";

import { useState } from "react";
import { Copy, Check } from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

/** Shows a temporary password ONCE. It is never stored in plain text and cannot be shown again. */
export function TempPasswordNotice({ password, intro }: { password: string; intro: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <Alert variant="warning" className="flex flex-col gap-2">
      <p>{intro}</p>
      <div className="flex items-center gap-2">
        <code className="bg-background text-foreground rounded px-2 py-1 font-mono text-base">{password}</code>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={async () => {
            await navigator.clipboard.writeText(password);
            setCopied(true);
          }}
        >
          {copied ? <Check /> : <Copy />} {copied ? "Copied" : "Copy"}
        </Button>
      </div>
      <p className="text-xs">
        Give it to the user in person or by a separate channel. It will not be shown again; they must change it at first
        sign-in.
      </p>
    </Alert>
  );
}
