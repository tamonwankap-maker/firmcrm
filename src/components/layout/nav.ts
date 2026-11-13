import type { Role } from "@/server/auth/policy";

export interface NavItem {
  href: string;
  label: string;
  icon: string; // lucide icon name, resolved in Sidebar
  /** Roles that see this item. Omit = everyone. */
  roles?: Role[];
  /** Phase that delivers the module (shown as "soon" until built). */
  phase?: number;
}

export interface NavSection {
  title?: string;
  items: NavItem[];
}

export const NAV: NavSection[] = [
  {
    items: [
      { href: "/dashboard", label: "Dashboard", icon: "LayoutDashboard" },
      { href: "/tasks", label: "My tasks", icon: "ListChecks", phase: 2 },
    ],
  },
  {
    title: "Relationships",
    items: [
      { href: "/organisations", label: "Organisations", icon: "Building2", phase: 2 },
      { href: "/contacts", label: "Contacts", icon: "Users", phase: 2 },
      { href: "/activities", label: "Activities", icon: "CalendarClock", phase: 2 },
      { href: "/client-plans", label: "Client plans", icon: "Target", phase: 5 },
    ],
  },
  {
    title: "Pipeline",
    items: [
      { href: "/opportunities", label: "Opportunities", icon: "TrendingUp", phase: 3 },
      { href: "/pitches", label: "Pitches", icon: "Presentation", phase: 3 },
    ],
  },
  {
    title: "Profile",
    items: [
      { href: "/rankings", label: "Rankings", icon: "Trophy", phase: 4 },
      { href: "/matters", label: "Rep. matters", icon: "BookOpen", phase: 4 },
      { href: "/awards", label: "Awards", icon: "Award", phase: 4 },
    ],
  },
  {
    title: "Marketing",
    items: [
      { href: "/events", label: "Events", icon: "CalendarDays", phase: 5 },
      { href: "/content", label: "Content", icon: "Newspaper", phase: 5 },
    ],
  },
  { items: [{ href: "/reports", label: "Reports", icon: "BarChart3", roles: ["ADMIN", "BD", "PARTNER"], phase: 6 }] },
  {
    title: "Admin",
    items: [
      { href: "/admin/users", label: "Users", icon: "UserCog", roles: ["ADMIN"] },
      { href: "/admin/lists", label: "Lists", icon: "List", roles: ["ADMIN"] },
      { href: "/admin/settings", label: "Settings", icon: "Settings", roles: ["ADMIN"] },
      { href: "/admin/audit", label: "Audit log", icon: "ShieldCheck", roles: ["ADMIN"] },
    ],
  },
];

/** Built so far — anything with a later phase renders as "soon". */
export const CURRENT_PHASE = 6;

export function navFor(role: Role): NavSection[] {
  return NAV.map((s) => ({ ...s, items: s.items.filter((i) => !i.roles || i.roles.includes(role)) })).filter(
    (s) => s.items.length > 0,
  );
}
