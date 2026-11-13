import "server-only";
import { db } from "@/server/db";

export interface LookupItem {
  id: string;
  name: string;
  active: boolean;
}

export async function listAllLookups(): Promise<Record<"practiceArea" | "industry" | "directory", LookupItem[]>> {
  const [practiceArea, industry, directory] = await Promise.all([
    db.practiceArea.findMany({
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      select: { id: true, name: true, active: true },
    }),
    db.industry.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true, active: true } }),
    db.directory.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true, active: true } }),
  ]);
  return { practiceArea, industry, directory };
}
