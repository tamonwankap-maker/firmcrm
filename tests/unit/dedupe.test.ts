import { describe, expect, it } from "vitest";
import { orgNameKey, orgNameThKey, personNameKey } from "@/features/organisations/dedupe";

describe("orgNameKey", () => {
  it("ignores legal forms, case and punctuation", () => {
    const k = orgNameKey("Siam Cement Public Company Limited");
    expect(k).toBe("siam cement");
    expect(orgNameKey("SIAM CEMENT PCL.")).toBe(k);
    expect(orgNameKey("Siam Cement Co., Ltd.")).toBe(k);
    expect(orgNameKey("siam cement")).toBe(k);
  });
  it("keeps meaningful words such as (Thailand)", () => {
    expect(orgNameKey("Toyota Motor (Thailand) Co., Ltd.")).toBe("toyota motor thailand");
  });
  it("treats & and 'and' the same and drops a leading 'The'", () => {
    expect(orgNameKey("The Smith & Jones LLP")).toBe(orgNameKey("Smith and Jones"));
  });
});

describe("orgNameThKey", () => {
  it("strips บริษัท / จำกัด / (มหาชน) and spaces", () => {
    const k = orgNameThKey("บริษัท ปูนซิเมนต์ไทย จำกัด (มหาชน)");
    expect(k).toBe("ปูนซิเมนต์ไทย");
    expect(orgNameThKey("บมจ. ปูนซิเมนต์ไทย")).toBe(k);
  });
  it("returns null for blank", () => {
    expect(orgNameThKey("")).toBeNull();
    expect(orgNameThKey(null)).toBeNull();
  });
});

describe("personNameKey", () => {
  it("drops honorifics in English and Thai", () => {
    expect(personNameKey("Khun Somchai Jaidee")).toBe("somchai jaidee");
    expect(personNameKey("Dr. Somchai  Jaidee")).toBe("somchai jaidee");
    expect(personNameKey("นายสมชาย ใจดี")).toBe("สมชาย ใจดี");
  });
});
