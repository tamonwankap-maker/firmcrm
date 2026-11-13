import * as React from "react";
import { cn } from "@/lib/utils";

export function Checkbox({ className, ...props }: Omit<React.ComponentProps<"input">, "type">) {
  return <input type="checkbox" className={cn("border-input accent-primary size-4 rounded", className)} {...props} />;
}
