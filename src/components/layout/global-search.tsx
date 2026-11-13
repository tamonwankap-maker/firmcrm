import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";

/** Global Thai/English search → /search. */
export function GlobalSearch() {
  return (
    <form action="/search" role="search" className="relative w-full max-w-md">
      <Search
        className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2"
        aria-hidden
      />
      <Input
        name="q"
        type="search"
        placeholder="Search organisations, contacts… / ค้นหา"
        aria-label="Search"
        className="pl-8"
      />
    </form>
  );
}
