import type { Metadata } from "next";
import Link from "next/link";
import { Plus, Upload } from "lucide-react";
import { requireUser } from "@/server/auth/current-user";
import { can } from "@/server/auth/policy";
import { contactFilterSchema, listContacts, listTagOptions } from "@/features/contacts/queries";
import { userOptions } from "@/features/lookups/options";
import { MAILING_LISTS, MAILING_LIST_LABELS, STRENGTH_LABELS } from "@/features/labels";
import { PageHeader } from "@/components/layout/page-header";
import { FilterBar, FilterField } from "@/components/layout/filter-bar";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { DEFAULT_PAGE_SIZE } from "@/lib/list-params";
import { ContactsTable } from "./contacts-table";

export const metadata: Metadata = { title: "Contacts" };

export default async function ContactsPage(props: PageProps<"/contacts">) {
  const me = await requireUser();
  const f = contactFilterSchema.parse(await props.searchParams);
  const [{ total, rows }, tags, owners] = await Promise.all([listContacts(me, f), listTagOptions(), userOptions()]);

  return (
    <>
      <PageHeader
        title="Contacts"
        description="People at clients, prospects, referrers and other organisations."
        actions={
          can(me, "create", "Contact") && (
            <>
              {(me.role === "ADMIN" || me.role === "BD") && (
                <Button asChild variant="outline">
                  <Link href="/import?type=contacts">
                    <Upload /> Import
                  </Link>
                </Button>
              )}
              <Button asChild>
                <Link href="/contacts/new">
                  <Plus /> New contact
                </Link>
              </Button>
            </>
          )
        }
      />
      <FilterBar resetHref="/contacts">
        <FilterField label="Search name / email" htmlFor="q">
          <Input id="q" name="q" type="search" defaultValue={f.q} className="w-56" />
        </FilterField>
        <FilterField label="Owner" htmlFor="owner">
          <NativeSelect id="owner" name="owner" defaultValue={f.owner ?? ""}>
            <option value="">All</option>
            {owners.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name}
              </option>
            ))}
          </NativeSelect>
        </FilterField>
        <FilterField label="Tag" htmlFor="tag">
          <NativeSelect id="tag" name="tag" defaultValue={f.tag ?? ""}>
            <option value="">All</option>
            {tags.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </NativeSelect>
        </FilterField>
        <FilterField label="Strength (min)" htmlFor="strength">
          <NativeSelect id="strength" name="strength" defaultValue={f.strength ? String(f.strength) : ""}>
            <option value="">Any</option>
            {[2, 3, 4, 5].map((n) => (
              <option key={n} value={n}>
                {STRENGTH_LABELS[n]}
              </option>
            ))}
          </NativeSelect>
        </FilterField>
        <FilterField label="Opted in to" htmlFor="consent">
          <NativeSelect id="consent" name="consent" defaultValue={f.consent ?? ""}>
            <option value="">Any</option>
            {MAILING_LISTS.map((l) => (
              <option key={l} value={l}>
                {MAILING_LIST_LABELS[l]}
              </option>
            ))}
          </NativeSelect>
        </FilterField>
        <div className="flex flex-col gap-1.5 pb-1 text-sm">
          <label className="flex items-center gap-2">
            <Checkbox name="mine" value="1" defaultChecked={!!f.mine} /> My contacts
          </label>
          <label className="flex items-center gap-2">
            <Checkbox name="archived" value="1" defaultChecked={f.archived} /> Archived
          </label>
        </div>
      </FilterBar>
      <ContactsTable
        rows={rows.map((c) => ({
          id: c.id,
          nameEn: c.nameEn,
          nameTh: c.nameTh,
          title: c.title,
          email: c.email,
          phone: c.phone,
          strength: c.relationshipStrength,
          organisation: c.organisation,
          owners: c.owners.map((o) => o.name),
          tags: c.tags.map((t) => t.name),
        }))}
        pagination={{ page: f.page, pageSize: DEFAULT_PAGE_SIZE, total }}
      />
    </>
  );
}
