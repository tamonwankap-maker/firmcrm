import "server-only";
import { db } from "@/server/db";

export function directoryOptions() {
  return db.directory.findMany({ where: { active: true }, orderBy: { name: "asc" }, select: { id: true, name: true } });
}
