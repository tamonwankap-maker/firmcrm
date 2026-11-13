/**
 * Static guardrails (CLAUDE.md rule 1): fail the build if a page, server action or route handler
 * forgets to authenticate. Cheap, and catches the most dangerous class of regression.
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const root = path.resolve(__dirname, "../../src");

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((f) => {
    const p = path.join(dir, f);
    return statSync(p).isDirectory() ? (f === "generated" ? [] : walk(p)) : [p];
  });
}
const files = walk(root);
const rel = (p: string) => path.relative(root, p);

describe("every server action authenticates", () => {
  const actionFiles = files.filter((f) => /\.(ts|tsx)$/.test(f) && readFileSync(f, "utf8").startsWith('"use server"'));
  it("found action files", () => expect(actionFiles.length).toBeGreaterThan(10));
  for (const file of actionFiles) {
    it(rel(file), () => {
      const src = readFileSync(file, "utf8");
      // Split into exported functions and check each body.
      const parts = src.split(/\nexport async function /).slice(1);
      expect(parts.length).toBeGreaterThan(0);
      for (const part of parts) {
        const name = part.slice(0, part.indexOf("("));
        // loginAction is the one deliberately public action; searchPicker uses requireUser too.
        if (name === "loginAction") continue;
        expect(part, `${rel(file)} → ${name} must call requireUser()/getCurrentUser()`).toMatch(
          /requireUser\(|getCurrentUser\(/,
        );
      }
    });
  }
});

describe("every app page authenticates", () => {
  const pages = files.filter((f) => f.includes(`${path.sep}(app)${path.sep}`) && f.endsWith(`${path.sep}page.tsx`));
  const PUBLIC = new Set(["app/(app)/no-access/page.tsx"]);
  it("found pages", () => expect(pages.length).toBeGreaterThan(30));
  for (const file of pages) {
    if (PUBLIC.has(rel(file))) continue;
    it(rel(file), () => {
      expect(readFileSync(file, "utf8")).toMatch(/requireUser\(|requirePageRole\(/);
    });
  }
});

describe("route handlers authenticate", () => {
  const routes = files.filter((f) => f.endsWith(`${path.sep}route.ts`));
  const PUBLIC = new Set(["app/api/health/route.ts", "app/api/auth/[...nextauth]/route.ts"]);
  for (const file of routes) {
    if (PUBLIC.has(rel(file))) continue;
    it(rel(file), () => {
      expect(readFileSync(file, "utf8")).toMatch(/getCurrentUser\(|requireUser\(/);
    });
  }
});

describe("no unsafe patterns in app code", () => {
  for (const file of files.filter((f) => /\.(ts|tsx)$/.test(f))) {
    const src = readFileSync(file, "utf8");
    if (/queryRawUnsafe|executeRawUnsafe|dangerouslySetInnerHTML/.test(src)) {
      it(`${rel(file)} has no unsafe raw SQL or raw HTML`, () =>
        expect(src).not.toMatch(/queryRawUnsafe|executeRawUnsafe|dangerouslySetInnerHTML/));
    }
  }
  it("health endpoint reveals nothing but status", () => {
    const src = readFileSync(path.join(root, "app/api/health/route.ts"), "utf8");
    expect(src).not.toMatch(/version|env|DATABASE/i);
  });
});
