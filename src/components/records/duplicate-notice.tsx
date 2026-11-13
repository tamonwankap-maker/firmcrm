import Link from "next/link";
import { Alert } from "@/components/ui/alert";
import { Checkbox } from "@/components/ui/checkbox";
import type { DuplicateMatch } from "@/server/actions/result";

/** Shown when the server finds possible duplicates; ticking the box re-submits with confirmDuplicate. */
export function DuplicateNotice({ matches }: { matches: DuplicateMatch[] }) {
  return (
    <Alert variant="warning" className="flex flex-col gap-2">
      <p className="font-medium">Possible duplicate. These records already exist:</p>
      <ul className="list-disc pl-5">
        {matches.map((m) => (
          <li key={m.id}>
            <Link href={m.href} target="_blank" className="underline">
              {m.label}
            </Link>
            {m.sub && <span className="text-xs"> — {m.sub}</span>}
          </li>
        ))}
      </ul>
      <label className="flex items-center gap-2 text-sm">
        <Checkbox name="confirmDuplicate" /> This is a different record — create it anyway
      </label>
    </Alert>
  );
}
