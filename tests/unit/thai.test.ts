import { describe, expect, it } from "vitest";
import { containsThai, escapeLike, normalizeOptional, normalizeText } from "@/lib/thai";

describe("normalizeText", () => {
  it("normalises the two SARA AM encodings to one", () => {
    const decomposed = "นํา"; // น + ํ + า
    const composed = "นำ"; // น + ำ
    expect(normalizeText(decomposed)).toBe(composed);
  });
  it("strips zero-width characters and collapses whitespace", () => {
    expect(normalizeText("  บริษัท​  ไทย  ")).toBe("บริษัท ไทย");
  });
  it("applies Unicode NFC", () => {
    expect(normalizeText("é")).toBe("é");
  });
  it("turns blank optional values into null", () => {
    expect(normalizeOptional("   ")).toBeNull();
    expect(normalizeOptional(undefined)).toBeNull();
    expect(normalizeOptional(" ก ")).toBe("ก");
  });
});

describe("containsThai / escapeLike", () => {
  it("detects Thai", () => {
    expect(containsThai("Siam ธนาคาร")).toBe(true);
    expect(containsThai("Siam Bank")).toBe(false);
  });
  it("escapes LIKE wildcards", () => {
    expect(escapeLike("50%_off\\")).toBe("50\\%\\_off\\\\");
  });
});
