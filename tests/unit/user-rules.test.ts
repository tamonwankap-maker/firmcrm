import { describe, expect, it } from "vitest";
import { checkAdminLockout, requiresSessionRevoke } from "@/features/users/rules";

const admin = { id: "a1", role: "ADMIN" as const, active: true, canLogin: true };

describe("checkAdminLockout", () => {
  it("blocks an admin demoting themselves", () => {
    expect(
      checkAdminLockout({ actorId: "a1", before: admin, after: { ...admin, role: "BD" }, otherActiveAdmins: 3 }),
    ).toMatch(/own admin/);
  });
  it("blocks an admin deactivating themselves", () => {
    expect(
      checkAdminLockout({ actorId: "a1", before: admin, after: { ...admin, active: false }, otherActiveAdmins: 3 }),
    ).toMatch(/own admin/);
  });
  it("blocks removing the last active admin", () => {
    expect(
      checkAdminLockout({ actorId: "other", before: admin, after: { ...admin, role: "BD" }, otherActiveAdmins: 0 }),
    ).toMatch(/At least one/);
  });
  it("allows demoting another admin when others remain", () => {
    expect(
      checkAdminLockout({ actorId: "other", before: admin, after: { ...admin, role: "BD" }, otherActiveAdmins: 1 }),
    ).toBeNull();
  });
  it("ignores non-admin changes", () => {
    expect(
      checkAdminLockout({
        actorId: "a1",
        before: { ...admin, role: "BD" },
        after: { ...admin, role: "VIEWER" },
        otherActiveAdmins: 0,
      }),
    ).toBeNull();
  });
});

describe("requiresSessionRevoke", () => {
  const base = { role: "BD" as const, active: true, canLogin: true };
  it("revokes on role change, deactivation or login removal", () => {
    expect(requiresSessionRevoke(base, { ...base, role: "VIEWER" })).toBe(true);
    expect(requiresSessionRevoke(base, { ...base, active: false })).toBe(true);
    expect(requiresSessionRevoke(base, { ...base, canLogin: false })).toBe(true);
  });
  it("does not revoke on unrelated edits", () => {
    expect(requiresSessionRevoke(base, base)).toBe(false);
  });
});
