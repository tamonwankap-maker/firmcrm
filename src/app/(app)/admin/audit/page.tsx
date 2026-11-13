import type { Metadata } from "next";
import { requirePageRole } from "@/server/auth/page-guards";
import {
  AUDIT_ACTIONS,
  AUDIT_PAGE_SIZE,
  auditFilterOptions,
  auditFilterSchema,
  listAuditLog,
} from "@/features/audit/queries";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { Label } from "@/components/ui/label";
import { AuditTable, type AuditRow } from "./audit-table";

export const metadata: Metadata = { title: "Audit log" };

export default async function AuditPage(props: PageProps<"/admin/audit">) {
  await requirePageRole("ADMIN");
  const filter = auditFilterSchema.parse(await props.searchParams);
  const [{ total, rows }, options] = await Promise.all([listAuditLog(filter), auditFilterOptions()]);

  const data: AuditRow[] = rows.map((r) => ({
    id: r.id,
    createdAt: r.createdAt.toISOString(),
    user: r.user?.name ?? "—",
    action: r.action,
    entity: r.entity,
    entityId: r.entityId,
    ip: r.ip,
    diff: r.diff ? JSON.stringify(r.diff, null, 2) : null,
  }));

  return (
    <>
      <PageHeader
        title="Audit log"
        description="Every change, sign-in and export. Entries cannot be edited or deleted."
      />
      <form className="bg-card mb-4 grid gap-3 rounded-lg border p-4 sm:grid-cols-3 lg:grid-cols-6" role="search">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="entity">Record type</Label>
          <NativeSelect id="entity" name="entity" defaultValue={filter.entity ?? ""}>
            <option value="">All</option>
            {options.entities.map((e) => (
              <option key={e}>{e}</option>
            ))}
          </NativeSelect>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="action">Action</Label>
          <NativeSelect id="action" name="action" defaultValue={filter.action ?? ""}>
            <option value="">All</option>
            {AUDIT_ACTIONS.map((a) => (
              <option key={a}>{a}</option>
            ))}
          </NativeSelect>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="userId">User</Label>
          <NativeSelect id="userId" name="userId" defaultValue={filter.userId ?? ""}>
            <option value="">All</option>
            {options.users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name}
              </option>
            ))}
          </NativeSelect>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="from">From</Label>
          <Input id="from" name="from" type="date" defaultValue={filter.from} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="to">To</Label>
          <Input id="to" name="to" type="date" defaultValue={filter.to} />
        </div>
        <div className="flex items-end">
          <Button type="submit" variant="outline" className="w-full">
            Apply filters
          </Button>
        </div>
      </form>
      <AuditTable rows={data} pagination={{ page: filter.page, pageSize: AUDIT_PAGE_SIZE, total }} />
    </>
  );
}
