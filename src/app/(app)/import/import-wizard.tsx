"use client";

import Link from "next/link";
import { startTransition, useActionState, useRef, useState } from "react";
import { Download, FileSpreadsheet } from "lucide-react";
import { commitImportAction, previewImportAction } from "@/features/import/actions";
import type { ImportSummary } from "@/features/import/service";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";

type Kind = "organisations" | "contacts";

const n = (count: number, one: string, many = `${one}s`) => `${count} ${count === 1 ? one : many}`;

export function ImportWizard({ initialKind }: { initialKind: Kind }) {
  const formRef = useRef<HTMLFormElement>(null);
  const [kind, setKind] = useState<Kind>(initialKind);
  const [preview, previewAction, previewing] = useActionState(previewImportAction, null);
  const [commit, commitAction, committing] = useActionState(commitImportAction, null);
  const summary: ImportSummary | undefined = preview?.ok ? preview.data : undefined;

  const submit = (which: "preview" | "commit") => {
    if (!formRef.current) return;
    const fd = new FormData(formRef.current);
    startTransition(() => (which === "preview" ? previewAction(fd) : commitAction(fd)));
  };

  if (commit?.ok && commit.data) {
    return (
      <Alert variant="success" className="flex flex-col gap-3">
        <p className="font-medium">
          {`Imported ${n(commit.data.created, kind.slice(0, -1))}`}
          {commit.data.organisationsCreated > 0 &&
            kind === "contacts" &&
            ` and created ${n(commit.data.organisationsCreated, "new organisation")}`}
          .
        </p>
        <div className="flex gap-2">
          <Button asChild size="sm">
            <Link href={`/${kind}`}>View {kind}</Link>
          </Button>
          <Button size="sm" variant="outline" onClick={() => window.location.reload()}>
            Import another file
          </Button>
        </div>
      </Alert>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle>1. Choose a file</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            ref={formRef}
            onSubmit={(e) => {
              e.preventDefault();
              submit("preview");
            }}
            className="flex flex-col gap-4"
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="kind">What are you importing?</Label>
                <NativeSelect id="kind" name="kind" value={kind} onChange={(e) => setKind(e.target.value as Kind)}>
                  <option value="organisations">Organisations</option>
                  <option value="contacts">Contacts</option>
                </NativeSelect>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="file">File (.xlsx or .csv, max 5 MB / 5,000 rows)</Label>
                <Input id="file" name="file" type="file" accept=".xlsx,.csv" required />
              </div>
            </div>
            {kind === "contacts" && (
              <label className="flex items-center gap-2 text-sm">
                <Checkbox name="createMissingOrganisations" defaultChecked /> Create organisations that don’t exist yet
                (as Prospects)
              </label>
            )}
            {summary && summary.consentRows > 0 && (
              <label className="flex items-start gap-2 rounded-md border border-amber-300 bg-amber-50 p-3 text-sm dark:border-amber-900 dark:bg-amber-950">
                <Checkbox name="confirmConsent" className="mt-0.5" />
                <span>
                  I confirm that the {n(summary.consentRows, "row")} marked as opted-in reflect real consent given by
                  those people, and that the evidence is kept (PDPA).
                </span>
              </label>
            )}
            <div className="flex flex-wrap items-center gap-3">
              <Button type="submit" variant="outline" disabled={previewing}>
                <FileSpreadsheet /> {previewing ? "Checking…" : "Check file"}
              </Button>
              <a
                href={`/api/import/template?type=${kind}`}
                className="text-primary inline-flex items-center gap-1 text-sm hover:underline"
              >
                <Download className="size-4" /> Download {kind} template
              </a>
            </div>
            {preview && !preview.ok && <Alert variant="destructive">{preview.error}</Alert>}
          </form>
        </CardContent>
      </Card>

      {summary && <Preview summary={summary} />}

      {summary && summary.missingHeaders.length === 0 && summary.toCreate > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>3. Import</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {commit && !commit.ok && <Alert variant="destructive">{commit.error}</Alert>}
            <div>
              <Button onClick={() => submit("commit")} disabled={committing}>
                {committing ? "Importing…" : `Import ${summary.toCreate} ${summary.kind}`}
              </Button>
            </div>
            <p className="text-muted-foreground text-xs">
              The file is re-checked when you import. Rows with errors or duplicates are skipped.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function Preview({ summary: s }: { summary: ImportSummary }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>2. Preview</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4 text-sm">
        {s.missingHeaders.length > 0 && (
          <Alert variant="destructive">
            Missing required columns: {s.missingHeaders.join(", ")}. Use the template headers.
          </Alert>
        )}
        <div className="flex flex-wrap gap-2">
          <Badge variant="secondary">{n(s.totalRows, "row")}</Badge>
          <Badge variant="success">{s.toCreate} to import</Badge>
          <Badge variant={s.duplicates.length ? "warning" : "outline"}>
            {n(s.duplicates.length, "duplicate")} (skipped)
          </Badge>
          <Badge variant={s.errors.length ? "destructive" : "outline"}>
            {n(s.errors.length, "row")} with errors (skipped)
          </Badge>
          {s.newOrganisations.length > 0 && (
            <Badge variant="outline">{n(s.newOrganisations.length, "new organisation")}</Badge>
          )}
          {s.consentRows > 0 && <Badge variant="warning">{s.consentRows} with mailing consent</Badge>}
        </div>
        {s.unknownHeaders.length > 0 && (
          <p className="text-muted-foreground text-xs">Ignored columns: {s.unknownHeaders.join(", ")}</p>
        )}
        {s.sample.length > 0 && (
          <div>
            <p className="mb-1 font-medium">First rows to import</p>
            <ul className="list-disc pl-5">
              {s.sample.map((r) => (
                <li key={r.row}>
                  {r.label}
                  {r.sub && (
                    <span className="text-muted-foreground" lang="th">
                      {" "}
                      · {r.sub}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}
        <IssueTable title="Errors" rows={s.errors} />
        <IssueTable title="Duplicates" rows={s.duplicates} />
      </CardContent>
    </Card>
  );
}

function IssueTable({ title, rows }: { title: string; rows: ImportSummary["errors"] }) {
  if (!rows.length) return null;
  return (
    <details open={title === "Errors"}>
      <summary className="cursor-pointer font-medium">
        {title} ({rows.length})
      </summary>
      <table className="mt-2 w-full text-xs">
        <thead>
          <tr className="text-muted-foreground text-left">
            <th className="w-14 py-1">Row</th>
            <th className="py-1">Name</th>
            <th className="py-1">Reason</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={`${r.row}-${r.message}`} className="border-t">
              <td className="py-1 tabular-nums">{r.row}</td>
              <td className="py-1">{r.label}</td>
              <td className="py-1">{r.message}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </details>
  );
}
