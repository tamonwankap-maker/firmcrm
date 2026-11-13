import { describe, expect, it } from "vitest";
import { can, canSee, BD_SUBJECTS, ADMIN_SUBJECTS, type Actor, type Role } from "@/server/auth/policy";

const actor = (role: Role, id = "me"): Actor => ({ id, role });
const ROLES: Role[] = ["ADMIN", "BD", "PARTNER", "VIEWER"];

const own = { memberIds: ["me"] };
const notOwn = { memberIds: ["someone-else"] };
const confOwn = { confidential: true, memberIds: ["me"] };
const confNotOwn = { confidential: true, memberIds: ["someone-else"] };

describe("policy: confidential visibility (canSee)", () => {
  // role → [non-conf, conf-member, conf-non-member]
  const expected: Record<Role, [boolean, boolean, boolean]> = {
    ADMIN: [true, true, true],
    BD: [true, true, false],
    PARTNER: [true, true, false],
    VIEWER: [true, false, false],
  };
  for (const role of ROLES) {
    it(`${role}`, () => {
      expect(canSee(actor(role), notOwn)).toBe(expected[role][0]);
      expect(canSee(actor(role), confOwn)).toBe(expected[role][1]);
      expect(canSee(actor(role), confNotOwn)).toBe(expected[role][2]);
    });
  }
});

describe("policy: BD records — full matrix", () => {
  // role → action → [own, notOwn, confOwn, confNotOwn]
  type Row = [boolean, boolean, boolean, boolean];
  const matrix: Record<Role, Record<"read" | "update" | "archive" | "export", Row> & { create: boolean }> = {
    ADMIN: {
      read: [true, true, true, true],
      update: [true, true, true, true],
      archive: [true, true, true, true],
      export: [true, true, true, true],
      create: true,
    },
    BD: {
      read: [true, true, true, false],
      update: [true, true, true, false],
      archive: [true, true, true, false],
      export: [true, true, true, false],
      create: true,
    },
    PARTNER: {
      read: [true, true, true, false],
      update: [true, false, true, false],
      archive: [true, false, true, false],
      export: [true, true, true, false],
      create: true,
    },
    VIEWER: {
      read: [true, true, false, false],
      update: [false, false, false, false],
      archive: [false, false, false, false],
      export: [false, false, false, false],
      create: false,
    },
  };
  const resources = [own, notOwn, confOwn, confNotOwn];

  for (const role of ROLES) {
    for (const subject of BD_SUBJECTS) {
      it(`${role} on ${subject}`, () => {
        const a = actor(role);
        for (const action of ["read", "update", "archive", "export"] as const) {
          resources.forEach((r, i) => {
            expect(can(a, action, subject, r), `${action} #${i}`).toBe(matrix[role][action][i]);
          });
        }
        expect(can(a, "create", subject)).toBe(matrix[role].create);
      });
    }
  }
});

describe("policy: hard delete", () => {
  it("is ADMIN-only", () => {
    for (const role of ROLES) {
      expect(can(actor(role), "delete", "Opportunity", own)).toBe(role === "ADMIN");
    }
  });
});

describe("policy: admin areas", () => {
  for (const subject of ADMIN_SUBJECTS) {
    it(`${subject} is ADMIN-only`, () => {
      for (const role of ROLES) {
        for (const action of ["read", "create", "update"] as const) {
          expect(can(actor(role), action, subject)).toBe(role === "ADMIN");
        }
      }
    });
  }
});

describe("policy: special subjects", () => {
  it("pipeline summary is readable by ADMIN, BD, PARTNER only and never editable by non-admins", () => {
    expect(can(actor("ADMIN"), "read", "PipelineSummary")).toBe(true);
    expect(can(actor("BD"), "read", "PipelineSummary")).toBe(true);
    expect(can(actor("PARTNER"), "read", "PipelineSummary")).toBe(true);
    expect(can(actor("VIEWER"), "read", "PipelineSummary")).toBe(false);
    expect(can(actor("PARTNER"), "update", "PipelineSummary")).toBe(false);
  });
  it("mailing consent (PDPA) is changed only by ADMIN and BD", () => {
    for (const role of ROLES) {
      expect(can(actor(role), "read", "MailingConsent")).toBe(true);
      expect(can(actor(role), "update", "MailingConsent")).toBe(role === "ADMIN" || role === "BD");
    }
  });
});
