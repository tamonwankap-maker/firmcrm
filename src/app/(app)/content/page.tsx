import type { Metadata } from "next";
import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { requireUser } from "@/server/auth/current-user";
import { can } from "@/server/auth/policy";
import { contentFilterSchema, listContent } from "@/features/content/queries";
import { createContentAction } from "@/features/content/actions";
import { ContentForm } from "@/features/content/components/content-form";
import { practiceAreaOptions } from "@/features/lookups/options";
import { CONTENT_STATUSES, CONTENT_STATUS_LABELS, CONTENT_TYPES, CONTENT_TYPE_LABELS } from "@/features/labels";
import { PageHeader } from "@/components/layout/page-header";
import { FilterBar, FilterField } from "@/components/layout/filter-bar";
import { Pager } from "@/components/layout/pager";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDateOnly } from "@/lib/dates";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Content" };

const STATUS_VARIANT = { IDEA: "outline", DRAFTING: "secondary", REVIEW: "warning", PUBLISHED: "success" } as const;

export default async function ContentPage(props: PageProps<"/content">) {
  const me = await requireUser();
  const sp = await props.searchParams;
  const f = contentFilterSchema.parse(sp);
  const [{ total, rows, counts }, practiceAreas] = await Promise.all([listContent(me, f), practiceAreaOptions()]);
  return (
    <>
      <PageHeader
        title="Content"
        description="Client alerts, articles, guides, LinkedIn posts, media interviews and speaking."
      />
      <div className="mb-4 flex flex-wrap gap-2">
        {CONTENT_STATUSES.map((s) => (
          <Link
            key={s}
            href={f.status === s ? "/content" : `/content?status=${s}`}
            className={cn(
              "hover:bg-accent rounded-md border px-3 py-1.5 text-sm",
              f.status === s && "border-primary bg-accent",
            )}
          >
            {CONTENT_STATUS_LABELS[s]} <span className="text-muted-foreground ml-1 tabular-nums">{counts[s] ?? 0}</span>
          </Link>
        ))}
      </div>
      <FilterBar resetHref="/content">
        {f.status && <input type="hidden" name="status" value={f.status} />}
        <FilterField label="Search title" htmlFor="filter-q">
          <Input id="filter-q" name="q" type="search" defaultValue={f.q} className="w-52" />
        </FilterField>
        <FilterField label="Type" htmlFor="filter-type">
          <NativeSelect id="filter-type" name="type" defaultValue={f.type ?? ""}>
            <option value="">All</option>
            {CONTENT_TYPES.map((t) => (
              <option key={t} value={t}>
                {CONTENT_TYPE_LABELS[t]}
              </option>
            ))}
          </NativeSelect>
        </FilterField>
        <FilterField label="Practice area" htmlFor="filter-practice">
          <NativeSelect id="filter-practice" name="practice" defaultValue={f.practice ?? ""}>
            <option value="">All</option>
            {practiceAreas.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </NativeSelect>
        </FilterField>
        <label className="flex items-center gap-2 pb-2 text-sm">
          <Checkbox name="mine" value="1" defaultChecked={!!f.mine} /> Mine
        </label>
      </FilterBar>
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Title</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Authors</TableHead>
                <TableHead>Publish date</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 && (
                <TableRow className="hover:bg-transparent">
                  <TableCell colSpan={5} className="text-muted-foreground h-20 text-center">
                    Nothing in the pipeline.
                  </TableCell>
                </TableRow>
              )}
              {rows.map((c) => (
                <TableRow key={c.id}>
                  <TableCell>
                    <Link href={`/content/${c.id}`} className="font-medium hover:underline">
                      {c.title}
                    </Link>
                    {c.url && (
                      <a
                        href={c.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-muted-foreground ml-1 inline-flex"
                        aria-label="Open link"
                      >
                        <ExternalLink className="size-3" />
                      </a>
                    )}
                    <div className="text-muted-foreground text-xs">
                      {[c.channel, c.practiceAreas.map((p) => p.name).join(", ")].filter(Boolean).join(" · ")}
                    </div>
                  </TableCell>
                  <TableCell className="text-xs">{CONTENT_TYPE_LABELS[c.type]}</TableCell>
                  <TableCell className="text-xs">{c.authors.map((a) => a.name).join(", ")}</TableCell>
                  <TableCell className="text-xs whitespace-nowrap">{formatDateOnly(c.publishDate) || "—"}</TableCell>
                  <TableCell>
                    <Badge variant={STATUS_VARIANT[c.status]}>{CONTENT_STATUS_LABELS[c.status]}</Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      <Pager page={f.page} pageSize={50} total={total} params={sp} path="/content" />
      {can(me, "create", "Content") && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Add to the content pipeline</CardTitle>
          </CardHeader>
          <CardContent>
            <ContentForm
              action={createContentAction}
              practiceAreas={practiceAreas}
              submitLabel="Add"
              resetOnSuccess
              defaults={{
                title: "",
                type: "",
                channel: "",
                status: "IDEA",
                publishDate: "",
                url: "",
                engagementNotes: "",
                authors: me.role === "PARTNER" ? [{ id: me.id, label: me.name }] : [],
                practiceAreaIds: [],
              }}
            />
          </CardContent>
        </Card>
      )}
    </>
  );
}
