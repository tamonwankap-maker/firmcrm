import type { Role } from "@/server/auth/policy";

export const ROLE_LABELS: Record<Role, string> = {
  ADMIN: "Admin",
  BD: "BD",
  PARTNER: "Partner",
  VIEWER: "Viewer",
};

export const ROLE_DESCRIPTIONS: Record<Role, string> = {
  ADMIN: "Head of BD — everything, including users and settings",
  BD: "BD managers/coordinators — create and edit all BD records",
  PARTNER: "Edit records they own or are on the team for; read-only firm pipeline summary",
  VIEWER: "Associates — read-only, no confidential records",
};
