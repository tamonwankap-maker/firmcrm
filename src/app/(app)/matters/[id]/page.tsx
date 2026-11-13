import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Pencil } from "lucide-react";
import { requireUser } from "@/server/auth/current-user";
import { can } from "@/server/auth/policy";
import { getMatter } from "@/features/matters/queries";
import { matterFacts } from "@/features/matters/facts";
import { setMatterArchivedAction } from "@/features/matters/actions";
import { matterClientLabel } from "@/features/rankings/rules";
import { ConfidentialBadge } from "@/features/opportunities/components/badges";
import { ArchiveButton } from "@/components/records/archive-button";
import { DetailList } from "@/components/records/detail-list";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatMoney } from "@/lib/money";

export const metadata: Metadata = { title: "Matter" };

export default async function MatterPage(props: PageProps<"/matters/[id]">) {
  const me = await requireUser();
  const { id } = await props.params;
  const m = await getMatter(me, id);
  if (!m) notFound();
  const canEdit = can(me, "update", "RepresentativeMatter", matterFacts(m));
  return (
    <div className="flex flex-col gap-6">
      {m.archivedAt && <Alert variant="warning">This matter is archived.</Alert>}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{m.title}</h1>
          <p className="mt-1 text-sm">
            {matterClientLabel(m)} · {m.year}
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {m.confidential && <ConfidentialBadge />}
            {m.publishable ? (
              <Badge variant="success">Publishable</Badge>
            ) : (
              <Badge variant="outline">Not publishable</Badge>
            )}
            {m.anonymised && <Badge variant="secondary">Anonymised</Badge>}
          </div>
        </div>
        {canEdit && (
          <div className="flex gap-2">
            <Button asChild variant="outline">
              <Link href={`/matters/${m.id}/edit`}>
                <Pencil /> Edit
              </Link>
            </Button>
            <ArchiveButton archived={!!m.archivedAt} action={setMatterArchivedAction.bind(null, m.id)} label="matter" />
          </div>
        )}
      </div>
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Description</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm whitespace-pre-line">{m.description}</p>
          </CardContent>
        </Card>
        <div className="flex flex-col gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Details</CardTitle>
            </CardHeader>
            <CardContent>
              <DetailList
                items={[
                  {
                    label: "Client (internal)",
                    value: m.clientOrganisation && (
                      <Link href={`/organisations/${m.clientOrganisation.id}`} className="text-primary hover:underline">
                        {m.clientOrganisation.nameEn}
                      </Link>
                    ),
                  },
                  { label: "Shown as", value: matterClientLabel(m) },
                  { label: "Value", value: formatMoney(m.value, m.currency) },
                  { label: "Practice areas", value: m.practiceAreas.map((p) => p.name).join(", ") },
                  { label: "Team", value: m.team.map((t) => t.name).join(", ") },
                ]}
              />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Used in submissions</CardTitle>
            </CardHeader>
            <CardContent>
              {m.submissions.length === 0 ? (
                <p className="text-muted-foreground text-sm">Not used yet.</p>
              ) : (
                <ul className="flex flex-col gap-1.5 text-sm">
                  {m.submissions.map((s) => (
                    <li key={s.id}>
                      <Link href={`/rankings/submissions/${s.id}`} className="hover:underline">
                        {s.directory.name} {s.year} — {s.practiceArea.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
