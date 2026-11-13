import "server-only";
import { db } from "@/server/db";

export function listUsers() {
  return db.user.findMany({
    orderBy: [{ active: "desc" }, { name: "asc" }],
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      title: true,
      active: true,
      canLogin: true,
      lastLoginAt: true,
      practiceAreas: { select: { id: true, name: true }, orderBy: { sortOrder: "asc" } },
    },
  });
}

export function getUser(id: string) {
  return db.user.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      title: true,
      active: true,
      canLogin: true,
      mustChangePassword: true,
      lastLoginAt: true,
      createdAt: true,
      practiceAreas: { select: { id: true } },
    },
  });
}

export function listPracticeAreaOptions() {
  return db.practiceArea.findMany({
    where: { active: true },
    orderBy: { sortOrder: "asc" },
    select: { id: true, name: true },
  });
}
