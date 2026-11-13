import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { requireUser } from "@/server/auth/current-user";
import { can } from "@/server/auth/policy";
import { updateContactAction } from "@/features/contacts/actions";
import { getContact, listTagOptions } from "@/features/contacts/queries";
import { contactFacts } from "@/features/contacts/facts";
import { ContactForm } from "@/features/contacts/components/contact-form";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";

export const metadata: Metadata = { title: "Edit contact" };

export default async function EditContactPage(props: PageProps<"/contacts/[id]/edit">) {
  const me = await requireUser();
  const { id } = await props.params;
  const [c, tags] = await Promise.all([getContact(id), listTagOptions()]);
  if (!c) notFound();
  if (!can(me, "update", "Contact", contactFacts(c))) redirect("/no-access");
  return (
    <div className="max-w-4xl">
      <PageHeader title={`Edit ${c.nameEn}`} />
      <Card>
        <CardContent className="pt-5">
          <ContactForm
            action={updateContactAction.bind(null, c.id)}
            submitLabel="Save changes"
            existingTags={tags.map((t) => t.name)}
            canCreateTags={can(me, "create", "Tag")}
            defaults={{
              nameEn: c.nameEn,
              nameTh: c.nameTh ?? "",
              title: c.title ?? "",
              organisation: c.organisation ? { id: c.organisation.id, label: c.organisation.nameEn } : null,
              email: c.email ?? "",
              phone: c.phone ?? "",
              linkedinUrl: c.linkedinUrl ?? "",
              owners: c.owners.map((o) => ({ id: o.id, label: o.name })),
              relationshipStrength: c.relationshipStrength,
              preferredLanguage: c.preferredLanguage,
              tags: c.tags.map((t) => t.name).join(", "),
              notes: c.notes ?? "",
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
}
