import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireUser } from "@/server/auth/current-user";
import { can } from "@/server/auth/policy";
import { db } from "@/server/db";
import { createContactAction } from "@/features/contacts/actions";
import { listTagOptions } from "@/features/contacts/queries";
import { ContactForm } from "@/features/contacts/components/contact-form";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";

export const metadata: Metadata = { title: "New contact" };

export default async function NewContactPage(props: PageProps<"/contacts/new">) {
  const me = await requireUser();
  if (!can(me, "create", "Contact")) redirect("/no-access");
  const sp = await props.searchParams;
  const orgId = typeof sp.org === "string" ? sp.org : undefined;
  const [org, tags] = await Promise.all([
    orgId ? db.organisation.findUnique({ where: { id: orgId }, select: { id: true, nameEn: true } }) : null,
    listTagOptions(),
  ]);
  return (
    <div className="max-w-4xl">
      <PageHeader title="New contact" />
      <Card>
        <CardContent className="pt-5">
          <ContactForm
            action={createContactAction}
            submitLabel="Create contact"
            existingTags={tags.map((t) => t.name)}
            canCreateTags={can(me, "create", "Tag")}
            defaults={{
              nameEn: "",
              nameTh: "",
              title: "",
              organisation: org ? { id: org.id, label: org.nameEn } : null,
              email: "",
              phone: "",
              linkedinUrl: "",
              owners: [{ id: me.id, label: me.name }],
              relationshipStrength: 3,
              preferredLanguage: "EN",
              tags: "",
              notes: "",
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
}
