import { cn } from "@/lib/utils";
import { HEALTH_LABELS } from "../../labels";

export function HealthPill({ score }: { score: number }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium",
        score <= 2
          ? "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300"
          : score === 3
            ? "bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-300"
            : "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300",
      )}
    >
      {HEALTH_LABELS[score]}
    </span>
  );
}
