import type { Metadata } from "next";
import Link from "next/link";
import { BookOpen, Building2, Lock, TrendingUp, User } from "lucide-react";
import { requireUser } from "@/server/auth/current-user";
import { globalSearch } from "@/features/search/queries";
import { ORG_TYPE_LABELS, STAGE_LABELS } from "@/features/labels";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = { title: "Search" };

export default async function SearchPage(props: PageProps<"/search">) {
  const me = await requireUser();
  const sp = await props.searchParams;
  const q = typeof sp.q === "string" ? sp.q.trim().slice(0, 100) : "";
  if (!q) {
    return (
      <>
        <PageHeader title="Search" />
        <p className="text-muted-foreground text-sm">
          Type a name, Thai or English, or an email address in the search box above.
        </p>
      </>
    );
  }
  const r = await globalSearch(me, q);
  return (
    <>
      <PageHeader
        title={`Results for “${q}”`}
        description={`${r.orgCount} organisations · ${r.contactCount} contacts · ${r.opps.length} opportunities · ${r.matters.length} matters`}
      />
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>Organisations</CardTitle>
            {r.orgCount > r.orgs.length && (
              <Link href={`/organisations?q=${encodeURIComponent(q)}`} className="text-primary text-sm hover:underline">
                See all {r.orgCount}
              </Link>
            )}
          </CardHeader>
          <CardContent>
            {r.orgs.length === 0 ? (
              <p className="text-muted-foreground text-sm">No organisations.</p>
            ) : (
              <ul className="flex flex-col divide-y">
                {r.orgs.map((o) => (
                  <li key={o.id} className="flex items-start gap-2 py-2 text-sm">
                    <Building2 className="text-muted-foreground mt-0.5 size-4" aria-hidden />
                    <div>
                      <Link href={`/organisations/${o.id}`} className="font-medium hover:underline">
                        {o.nameEn}
                      </Link>
                      {o.nameTh && (
                        <span className="text-muted-foreground" lang="th">
                          {" "}
                          · {o.nameTh}
                        </span>
                      )}
                      <div className="text-muted-foreground text-xs">
                        {ORG_TYPE_LABELS[o.type]}
                        {o.isKeyClient && " · Key client"}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>Contacts</CardTitle>
            {r.contactCount > r.contacts.length && (
              <Link href={`/contacts?q=${encodeURIComponent(q)}`} className="text-primary text-sm hover:underline">
                See all {r.contactCount}
              </Link>
            )}
          </CardHeader>
          <CardContent>
            {r.contacts.length === 0 ? (
              <p className="text-muted-foreground text-sm">No contacts.</p>
            ) : (
              <ul className="flex flex-col divide-y">
                {r.contacts.map((c) => (
                  <li key={c.id} className="flex items-start gap-2 py-2 text-sm">
                    <User className="text-muted-foreground mt-0.5 size-4" aria-hidden />
                    <div>
                      <Link href={`/contacts/${c.id}`} className="font-medium hover:underline">
                        {c.nameEn}
                      </Link>
                      {c.nameTh && (
                        <span className="text-muted-foreground" lang="th">
                          {" "}
                          · {c.nameTh}
                        </span>
                      )}
                      <div className="text-muted-foreground text-xs">
                        {[c.title, c.organisation?.nameEn, c.email].filter(Boolean).join(" · ")}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
        {r.opps.length > 0 && (
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Opportunities</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="flex flex-col divide-y">
                {r.opps.map((o) => (
                  <li key={o.id} className="flex items-start gap-2 py-2 text-sm">
                    <TrendingUp className="text-muted-foreground mt-0.5 size-4" aria-hidden />
                    <div>
                      <Link href={`/opportunities/${o.id}`} className="font-medium hover:underline">
                        {o.confidential && (
                          <Lock className="text-destructive mr-1 inline size-3" aria-label="Confidential" />
                        )}
                        {o.name}
                      </Link>
                      <div className="text-muted-foreground text-xs">
                        {o.organisation.nameEn} · {STAGE_LABELS[o.stage]}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}
        {r.matters.length > 0 && (
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Representative matters</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="flex flex-col divide-y">
                {r.matters.map((m) => (
                  <li key={m.id} className="flex items-start gap-2 py-2 text-sm">
                    <BookOpen className="text-muted-foreground mt-0.5 size-4" aria-hidden />
                    <Link href={`/matters/${m.id}`} className="font-medium hover:underline">
                      {m.confidential && (
                        <Lock className="text-destructive mr-1 inline size-3" aria-label="Confidential" />
                      )}
                      {m.title}
                    </Link>
                    <span className="text-muted-foreground text-xs">{m.year}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}
      </div>
    </>
  );
}
