"use client";

import Link from "next/link";
import { createUserAction } from "@/features/users/actions";
import { UserForm } from "@/features/users/components/user-form";
import { TempPasswordNotice } from "@/features/users/components/temp-password-notice";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

export function NewUserForm({ practiceAreas }: { practiceAreas: { id: string; name: string }[] }) {
  return (
    <UserForm
      mode="create"
      action={createUserAction}
      practiceAreas={practiceAreas}
      onSuccess={(data) => (
        <div className="flex flex-col gap-4">
          {data?.tempPassword ? (
            <TempPasswordNotice intro="User created. Temporary password:" password={data.tempPassword} />
          ) : (
            <Alert variant="success">User created (no login).</Alert>
          )}
          <div className="flex gap-2">
            <Button asChild variant="outline">
              <Link href="/admin/users">Back to users</Link>
            </Button>
            {data && (
              <Button asChild variant="outline">
                <Link href={`/admin/users/${data.id}`}>Open user</Link>
              </Button>
            )}
          </div>
        </div>
      )}
    />
  );
}
