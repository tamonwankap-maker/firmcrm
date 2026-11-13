"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Award,
  BarChart3,
  BookOpen,
  Building2,
  CalendarClock,
  CalendarDays,
  LayoutDashboard,
  List,
  ListChecks,
  Newspaper,
  Presentation,
  Settings,
  ShieldCheck,
  Target,
  TrendingUp,
  Trophy,
  UserCog,
  Users,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { CURRENT_PHASE, type NavSection } from "./nav";

const ICONS: Record<string, LucideIcon> = {
  Award,
  BarChart3,
  BookOpen,
  Building2,
  CalendarClock,
  CalendarDays,
  LayoutDashboard,
  List,
  ListChecks,
  Newspaper,
  Presentation,
  Settings,
  ShieldCheck,
  Target,
  TrendingUp,
  Trophy,
  UserCog,
  Users,
};

export function SidebarNav({ sections, onNavigate }: { sections: NavSection[]; onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <nav aria-label="Main" className="flex flex-col gap-5 px-3 py-4">
      {sections.map((section, i) => (
        <div key={section.title ?? i}>
          {section.title && (
            <div className="text-sidebar-muted px-2 pb-1.5 text-[11px] font-semibold tracking-wider uppercase">
              {section.title}
            </div>
          )}
          <ul className="flex flex-col gap-0.5">
            {section.items.map((item) => {
              const Icon = ICONS[item.icon] ?? List;
              const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
              const soon = (item.phase ?? 0) > CURRENT_PHASE;
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={onNavigate}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "text-sidebar-foreground/85 hover:bg-sidebar-active hover:text-sidebar-foreground flex items-center gap-2.5 rounded-md px-2 py-1.5 text-sm transition-colors",
                      active && "bg-sidebar-active text-sidebar-foreground font-medium",
                      soon && "opacity-60",
                    )}
                  >
                    <Icon className="size-4 shrink-0" aria-hidden />
                    <span className="flex-1 truncate">{item.label}</span>
                    {soon && <span className="text-sidebar-muted text-[10px] tracking-wide uppercase">soon</span>}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}
