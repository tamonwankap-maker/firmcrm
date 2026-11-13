import Link from "next/link";
import { requireUser } from "@/server/auth/current-user";
import { navFor } from "@/components/layout/nav";
import { SidebarNav } from "@/components/layout/sidebar";
import { MobileNav } from "@/components/layout/mobile-nav";
import { UserMenu } from "@/components/layout/user-menu";
import { GlobalSearch } from "@/components/layout/global-search";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser({ allowPasswordChange: true });
  const sections = navFor(user.role);

  return (
    <div className="flex min-h-screen">
      <aside className="bg-sidebar sticky top-0 hidden h-screen w-60 shrink-0 overflow-y-auto lg:block">
        <Link href="/dashboard" className="flex items-center gap-2 px-5 pt-5 pb-1">
          <span className="bg-brand-gold inline-block size-2.5 rounded-full" aria-hidden />
          <span className="text-sidebar-foreground font-semibold tracking-tight">BD CRM</span>
        </Link>
        <SidebarNav sections={sections} />
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="bg-background/95 sticky top-0 z-30 flex h-14 items-center gap-3 border-b px-4 backdrop-blur">
          <MobileNav sections={sections} />
          <GlobalSearch />
          <div className="ml-auto">
            <UserMenu user={user} />
          </div>
        </header>
        <main className="flex-1 px-4 py-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}
