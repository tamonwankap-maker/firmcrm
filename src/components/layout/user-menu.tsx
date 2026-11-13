import Link from "next/link";
import { LogOut, KeyRound } from "lucide-react";
import { signOutAction } from "@/features/auth/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { CurrentUser } from "@/server/auth/current-user";
import { ROLE_LABELS } from "@/features/users/labels";

export function UserMenu({ user }: { user: CurrentUser }) {
  return (
    <div className="flex items-center gap-2">
      <div className="hidden text-right sm:block">
        <div className="text-sm leading-tight font-medium">{user.name}</div>
        <div className="text-muted-foreground text-xs">{user.email}</div>
      </div>
      <Badge variant="secondary">{ROLE_LABELS[user.role]}</Badge>
      <Button variant="ghost" size="icon" asChild aria-label="Change password" title="Change password">
        <Link href="/account/password">
          <KeyRound />
        </Link>
      </Button>
      <form action={signOutAction}>
        <Button variant="ghost" size="icon" type="submit" aria-label="Sign out" title="Sign out">
          <LogOut />
        </Button>
      </form>
    </div>
  );
}
