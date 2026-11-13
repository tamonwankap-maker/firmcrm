import type { Metadata } from "next";
import { requireUser } from "@/server/auth/current-user";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Alert } from "@/components/ui/alert";
import { ChangePasswordForm } from "./change-password-form";

export const metadata: Metadata = { title: "Change password" };

export default async function ChangePasswordPage() {
  const user = await requireUser({ allowPasswordChange: true });
  return (
    <div className="max-w-md">
      <PageHeader title="Change password" />
      {user.mustChangePassword && (
        <Alert variant="warning" className="mb-4">
          You are using a temporary password. Please choose a new one to continue.
        </Alert>
      )}
      <Card>
        <CardContent className="pt-5">
          <ChangePasswordForm />
        </CardContent>
      </Card>
    </div>
  );
}
