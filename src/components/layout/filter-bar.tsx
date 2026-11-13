import Link from "next/link";
import { Button } from "@/components/ui/button";

/** GET form for list filters. Children are labelled inputs/selects; values go into the URL. */
export function FilterBar({ children, resetHref }: { children: React.ReactNode; resetHref: string }) {
  return (
    <form role="search" className="bg-card mb-4 flex flex-wrap items-end gap-3 rounded-lg border p-3">
      {children}
      <div className="flex gap-2">
        <Button type="submit" variant="outline" size="sm" className="h-9">
          Apply
        </Button>
        <Button asChild variant="ghost" size="sm" className="h-9">
          <Link href={resetHref}>Reset</Link>
        </Button>
      </div>
    </form>
  );
}

export function FilterField({
  label,
  htmlFor,
  children,
}: {
  label: string;
  htmlFor: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-w-36 flex-col gap-1">
      <label htmlFor={htmlFor} className="text-muted-foreground text-xs font-medium">
        {label}
      </label>
      {children}
    </div>
  );
}
