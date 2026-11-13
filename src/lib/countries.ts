/** ISO 3166-1 alpha-2 codes. Names come from Intl so they stay current. */
const CODES =
  "TH JP SG CN HK US GB MY VN ID PH KR TW IN AU DE FR NL CH LU AE MM KH LA BN NZ CA IT ES SE DK NO FI IE BE AT PL CZ RU TR SA QA KW BH OM IL ZA EG NG KE BR MX AR CL CO PE MO MN LK BD PK NP".split(
    " ",
  );
const ALL_CODES =
  "AD AE AF AG AI AL AM AO AQ AR AS AT AU AW AX AZ BA BB BD BE BF BG BH BI BJ BL BM BN BO BQ BR BS BT BV BW BY BZ CA CC CD CF CG CH CI CK CL CM CN CO CR CU CV CW CX CY CZ DE DJ DK DM DO DZ EC EE EG EH ER ES ET FI FJ FK FM FO FR GA GB GD GE GF GG GH GI GL GM GN GP GQ GR GS GT GU GW GY HK HM HN HR HT HU ID IE IL IM IN IO IQ IR IS IT JE JM JO JP KE KG KH KI KM KN KP KR KW KY KZ LA LB LC LI LK LR LS LT LU LV LY MA MC MD ME MF MG MH MK ML MM MN MO MP MQ MR MS MT MU MV MW MX MY MZ NA NC NE NF NG NI NL NO NP NR NU NZ OM PA PE PF PG PH PK PL PM PN PR PS PT PW PY QA RE RO RS RU RW SA SB SC SD SE SG SH SI SJ SK SL SM SN SO SR SS ST SV SX SY SZ TC TD TF TG TH TJ TK TL TM TN TO TR TT TV TW TZ UA UG UM US UY UZ VA VC VE VG VI VN VU WF WS YE YT ZA ZM ZW".split(
    " ",
  );

const names = new Intl.DisplayNames(["en"], { type: "region" });

export function countryName(code: string | null | undefined): string {
  if (!code) return "";
  try {
    return names.of(code) ?? code;
  } catch {
    return code;
  }
}

export function isCountryCode(code: string): boolean {
  return ALL_CODES.includes(code);
}

/** Options for a country <select>: common ASEAN/Asia/key markets first, then everything A–Z. */
export function countryOptions(): { code: string; name: string; common: boolean }[] {
  const common = CODES.map((code) => ({ code, name: countryName(code), common: true }));
  const rest = ALL_CODES.filter((c) => !CODES.includes(c))
    .map((code) => ({ code, name: countryName(code), common: false }))
    .sort((a, b) => a.name.localeCompare(b.name));
  return [...common, ...rest];
}

/** Resolve "Thailand", "th", "ไทย"-free English names to an ISO code (used by import). */
export function resolveCountry(input: string | null | undefined): string | null {
  if (!input) return null;
  const v = input.trim();
  if (!v) return null;
  const upper = v.toUpperCase();
  if (upper.length === 2 && isCountryCode(upper)) return upper;
  const aliases: Record<string, string> = {
    UK: "GB",
    USA: "US",
    "UNITED STATES OF AMERICA": "US",
    ไทย: "TH",
    ประเทศไทย: "TH",
  };
  if (aliases[upper] || aliases[v]) return aliases[upper] ?? aliases[v];
  const hit = ALL_CODES.find((c) => countryName(c).toUpperCase() === upper);
  return hit ?? null;
}
