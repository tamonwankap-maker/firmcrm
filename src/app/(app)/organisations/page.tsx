import type { Metadata } from "next";
import Link from "next/link";
import { Plus, Upload } from "lucide-react";
import { requireUser } from "@/server/auth/current-user";
import { can } from "@/server/auth/policy";
import {
  listIndustryOptions,
  listOrganisations,
  listPartnerOptions,
  orgFilterSchema,
} from "@/features/organisations/queries";
import { ORG_STATUSES, ORG_STATUS_LABELS, ORG_TYPES, ORG_TYPE_LABELS } from "@/features/labels";
import { PageHeader } from "@/components/layout/page-header";
import { FilterBar, FilterField } from "@/components/layout/filter-bar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { Checkbox } from "@/components/ui/checkbox";
import { DEFAULT_PAGE_SIZE } from "@/lib/list-params";
import { countryName } from "@/lib/countries";
import { OrganisationsTable } from "./organisations-table";

export const metadata: Metadata = { title: "Organisations" };

export default async function OrganisationsPage(props: PageProps<"/organisations">) {
  const me = await requireUser();
  const f = orgFilterSchema.parse(await props.searchParams);
  const [{ total, rows }, industries, partners] = await Promise.all([
    listOrganisations(me, f),
    listIndustryOptions(),
    listPartnerOptions(),
  ]);
  const canCreate = can(me, "create", "Organisation");

  return (
    <>
      <PageHeader
        title="Organisations"
        description="Clients, prospects, referrers, foreign law firms and other organisations."
        actions={
          canCreate && (
            <>
              {(me.role === "ADMIN" || me.role === "BD") && (
                <Button asChild variant="outline">
                  <Link href="/import">
                    <Upload /> Import
                  </Link>
                </Button>
              )}
              <Button asChild>
                <Link href="/organisations/new">
                  <Plus /> New organisation
                </Link>
              </Button>
            </>
          )
        }
      />
      <FilterBar resetHref="/organisations">
        <FilterField label="Search (EN / ไทย)" htmlFor="q">
          <Input id="q" name="q" type="search" defaultValue={f.q} className="w-56" />
        </FilterField>
        <FilterField label="Type" htmlFor="type">
          <NativeSelect id="type" name="type" defaultValue={f.type ?? ""}>
            <option value="">All</option>
            {ORG_TYPES.map((t) => (
              <option key={t} value={t}>
                {ORG_TYPE_LABELS[t]}
              </option>
            ))}
          </NativeSelect>
        </FilterField>
        <FilterField label="Status" htmlFor="status">
          <NativeSelect id="status" name="status" defaultValue={f.status ?? ""}>
            <option value="">All</option>
            {ORG_STATUSES.map((s) => (
              <option key={s} value={s}>
                {ORG_STATUS_LABELS[s]}
              </option>
            ))}
          </NativeSelect>
        </FilterField>
        <FilterField label="Relationship partner" htmlFor="partner">
          <NativeSelect id="partner" name="partner" defaultValue={f.partner ?? ""}>
            <option value="">All</option>
            {partners.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </NativeSelect>
        </FilterField>
        <FilterField label="Industry" htmlFor="industry">
          <NativeSelect id="industry" name="industry" defaultValue={f.industry ?? ""}>
            <option value="">All</option>
            {industries.map((i) => (
              <option key={i.id} value={i.id}>
                {i.name}
              </option>
            ))}
          </NativeSelect>
        </FilterField>
        <div className="flex flex-col gap-1.5 pb-1 text-sm">
          <label className="flex items-center gap-2">
            <Checkbox name="key" value="1" defaultChecked={!!f.key} /> Key clients
          </label>
          <label className="flex items-center gap-2">
            <Checkbox name="archived" value="1" defaultChecked={f.archived} /> Archived
          </label>
        </div>
      </FilterBar>
      <OrganisationsTable
        rows={rows.map((o) => ({
          id: o.id,
          nameEn: o.nameEn,
          nameTh: o.nameTh,
          type: o.type,
          status: o.status,
          isKeyClient: o.isKeyClient,
          country: countryName(o.country),
          industry: o.industry?.name ?? null,
          partner: o.relationshipPartner?.name ?? null,
          contacts: o._count.contacts,
          lastActivity: o.activities[0]?.date.toISOString() ?? null,
        }))}
        pagination={{ page: f.page, pageSize: DEFAULT_PAGE_SIZE, total }}
      />
    </>
  );
}
