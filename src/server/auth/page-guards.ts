import "server-only";
import { redirect } from "next/navigation";
import { requireUser, type CurrentUser } from "./current-user";
import type { Role } from "./policy";

/** For pages: require one of the roles, otherwise show the "no access" page. */
export async function requirePageRole(...roles: Role[]): Promise<CurrentUser> {
  const user = await requireUser();
  if (!roles.includes(user.role)) redirect("/no-access");
  return user;
}
