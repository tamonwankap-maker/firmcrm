import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requirePageRole } from "@/server/auth/page-guards";
import { getUser, listPracticeAreaOptions } from "@/features/users/queries";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDateTime } from "@/lib/dates";
import { EditUserForm } from "./edit-user-form";
import { ResetPasswordButton } from "./reset-password-button";

export const metadata: Metadata = { title: "Edit user" };

export default async function EditUserPage(props: PageProps<"/admin/users/[id]">) {
  const me = await requirePageRole("ADMIN");
  const { id } = await props.params;
  const [user, practiceAreas] = await Promise.all([getUser(id), listPracticeAreaOptions()]);
  if (!user) notFound();

  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <PageHeader
        title={user.name}
        description={`Created ${formatDateTime(user.createdAt)} · Last sign-in ${formatDateTime(user.lastLoginAt) || "never"}`}
      />
      <Card>
        <CardContent className="pt-5">
          <EditUserForm
            userId={user.id}
            practiceAreas={practiceAreas}
            defaults={{
              name: user.name,
              email: user.email,
              role: user.role,
              title: user.title ?? "",
              practiceAreaIds: user.practiceAreas.map((p) => p.id),
              canLogin: user.canLogin,
              active: user.active,
            }}
          />
        </CardContent>
      </Card>
      {user.id !== me.id && (
        <Card>
          <CardHeader>
            <CardTitle>Password</CardTitle>
            <CardDescription>
              Issue a new temporary password. The user is signed out everywhere and must choose a new password at next
              sign-in.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResetPasswordButton userId={user.id} />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
