/**
 * Name keys for duplicate detection (pure; unit-tested).
 * "Siam Cement Public Company Limited" and "SIAM CEMENT PCL." → "siam cement".
 * "บริษัท ปูนซิเมนต์ไทย จำกัด (มหาชน)" → "ปูนซิเมนต์ไทย".
 */
import { normalizeText } from "@/lib/thai";

const EN_SUFFIXES = [
  "public company limited",
  "public co ltd",
  "company limited",
  "co ltd",
  "corporation",
  "limited",
  "pcl",
  "plc",
  "ltd",
  "inc",
  "corp",
  "llc",
  "llp",
  "pte",
  "gmbh",
  "kk",
  "bv",
  "nv",
  "sa",
  "ag",
  "co",
];

export function orgNameKey(name: string): string {
  let s = normalizeText(name)
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[.,()'"’\-_/]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  // Strip trailing legal-form words repeatedly ("co ltd", then nothing left to strip).
  let changed = true;
  while (changed) {
    changed = false;
    for (const suffix of EN_SUFFIXES) {
      if (s.endsWith(` ${suffix}`)) {
        s = s.slice(0, -suffix.length - 1).trim();
        changed = true;
      }
    }
  }
  if (s.startsWith("the ")) s = s.slice(4);
  return s;
}

const TH_NOISE = [
  "ห้างหุ้นส่วนจำกัด",
  "บริษัทมหาชนจำกัด",
  "บริษัท",
  "จำกัด",
  "มหาชน",
  "บมจ.",
  "บจก.",
  "หจก.",
  "บมจ",
  "บจก",
  "หจก",
];

export function orgNameThKey(name: string | null | undefined): string | null {
  if (!name) return null;
  let s = normalizeText(name);
  for (const w of TH_NOISE) s = s.split(w).join(" ");
  s = s.replace(/[.,()'"\s]/g, "");
  return s || null;
}

const PERSON_TITLES = ["mr", "mrs", "ms", "miss", "dr", "prof", "khun", "k"];
const TH_PERSON_TITLES = ["นางสาว", "นาย", "นาง", "คุณ", "ดร."];

export function personNameKey(name: string): string {
  let s = normalizeText(name);
  for (const t of TH_PERSON_TITLES) if (s.startsWith(t)) s = s.slice(t.length);
  s = s
    .toLowerCase()
    .replace(/[.,()'"’\-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  const parts = s.split(" ");
  while (parts.length > 1 && PERSON_TITLES.includes(parts[0])) parts.shift();
  return parts.join(" ");
}
