import Link from "next/link";
import { Button } from "@/components/ui/button";

/** Server-rendered previous/next links that keep the current filters. */
export function Pager({
  page,
  pageSize,
  total,
  params,
  path,
}: {
  page: number;
  pageSize: number;
  total: number;
  params: Record<string, string | string[] | undefined>;
  path: string;
}) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const href = (p: number) => {
    const q = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) {
      if (k === "page" || v == null) continue;
      for (const x of Array.isArray(v) ? v : [v]) q.append(k, x);
    }
    q.set("page", String(p));
    return `${path}?${q.toString()}`;
  };
  return (
    <div className="mt-3 flex items-center justify-between text-sm">
      <span className="text-muted-foreground">
        {total.toLocaleString("en-GB")} records · page {page} of {pages}
      </span>
      <div className="flex gap-2">
        {page > 1 && (
          <Button asChild variant="outline" size="sm">
            <Link href={href(page - 1)}>Previous</Link>
          </Button>
        )}
        {page < pages && (
          <Button asChild variant="outline" size="sm">
            <Link href={href(page + 1)}>Next</Link>
          </Button>
        )}
      </div>
    </div>
  );
}
