import "server-only";
import { db } from "@/server/db";

export function practiceAreaOptions() {
  return db.practiceArea.findMany({
    where: { active: true },
    orderBy: { sortOrder: "asc" },
    select: { id: true, name: true },
  });
}

export function userOptions() {
  return db.user.findMany({
    where: { active: true, canLogin: true },
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });
}
