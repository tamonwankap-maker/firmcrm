import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { normalizeText } from "@/lib/thai";
import { db, resetDb } from "./helpers";

/** Proves substring search works for Thai (no spaces between words) and English, case-insensitively. */
beforeAll(async () => {
  await resetDb();
  await db.organisation.createMany({
    data: [
      { nameEn: "Siam Cement Group", nameTh: "เครือซิเมนต์ไทย", type: "CLIENT" },
      { nameEn: "Kasikorn Bank", nameTh: "ธนาคารกสิกรไทย", type: "CLIENT" },
      { nameEn: "Bangkok Bank", nameTh: "ธนาคารกรุงเทพ", type: "PROSPECT" },
      { nameEn: "Thai Beverage", nameTh: normalizeText("ไทยเบฟเวอเรจ จำกัด"), type: "PROSPECT" },
    ],
  });
});
afterAll(() => db.$disconnect());

const search = async (q: string) =>
  (
    await db.organisation.findMany({
      where: {
        OR: [{ nameEn: { contains: q, mode: "insensitive" } }, { nameTh: { contains: q, mode: "insensitive" } }],
      },
      orderBy: { nameEn: "asc" },
    })
  ).map((o) => o.nameEn);

describe("Thai-aware search", () => {
  it("finds a Thai word in the middle of an unspaced name", async () => {
    expect(await search("กสิกร")).toEqual(["Kasikorn Bank"]);
  });
  it("matches a shared Thai substring across records", async () => {
    expect(await search("ธนาคาร")).toEqual(["Bangkok Bank", "Kasikorn Bank"]);
    expect(await search("ไทย")).toEqual(["Kasikorn Bank", "Siam Cement Group", "Thai Beverage"]);
  });
  it("matches English case-insensitively", async () => {
    expect(await search("bank")).toEqual(["Bangkok Bank", "Kasikorn Bank"]);
  });
  it("matches regardless of which SARA AM encoding the user typed", async () => {
    expect(await search(normalizeText("จํากัด"))).toEqual(["Thai Beverage"]);
  });
  it("has trigram indexes on name columns", async () => {
    const idx = await db.$queryRaw<{ indexname: string }[]>`
      SELECT indexname FROM pg_indexes WHERE tablename = 'Organisation' AND indexdef ILIKE '%gin_trgm_ops%'`;
    expect(idx.map((i) => i.indexname).sort()).toEqual([
      "Organisation_nameEn_trgm",
      "Organisation_nameKey_trgm",
      "Organisation_nameThKey_trgm",
      "Organisation_nameTh_trgm",
    ]);
  });
});
