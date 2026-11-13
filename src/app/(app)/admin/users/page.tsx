import type { Metadata } from "next";
import Link from "next/link";
import { Plus } from "lucide-react";
import { requirePageRole } from "@/server/auth/page-guards";
import { listUsers } from "@/features/users/queries";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { UsersTable, type UserRow } from "./users-table";

export const metadata: Metadata = { title: "Users" };

export default async function UsersPage() {
  await requirePageRole("ADMIN");
  const users = await listUsers();
  const rows: UserRow[] = users.map((u) => ({
    id: u.id,
    name: u.name,
    email: u.email,
    role: u.role,
    title: u.title ?? "",
    active: u.active,
    canLogin: u.canLogin,
    lastLoginAt: u.lastLoginAt?.toISOString() ?? null,
    practiceAreas: u.practiceAreas.map((p) => p.name),
  }));
  return (
    <>
      <PageHeader
        title="Users"
        description="Everyone at the firm who uses the CRM, plus lawyers recorded without a login (speakers, ranked lawyers, pitch teams)."
        actions={
          <Button asChild>
            <Link href="/admin/users/new">
              <Plus /> Add user
            </Link>
          </Button>
        }
      />
      <UsersTable rows={rows} />
    </>
  );
}
