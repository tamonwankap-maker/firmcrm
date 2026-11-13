export type CurrencyCode = "THB" | "USD";

type Numeric = number | string | { toString(): string } | null | undefined;

function toNumber(value: Numeric): number | null {
  if (value == null) return null;
  const n = typeof value === "number" ? value : Number(value.toString());
  return Number.isFinite(n) ? n : null;
}

/** "฿1,250,000" / "US$12,000". Amounts are whole units; decimals shown only when present. */
export function formatMoney(value: Numeric, currency: CurrencyCode = "THB"): string {
  const n = toNumber(value);
  if (n == null) return "";
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency,
    currencyDisplay: currency === "USD" ? "symbol" : "narrowSymbol",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(n);
}

/** Convert to THB for pipeline totals using the admin-set rate. */
export function toThb(value: Numeric, currency: CurrencyCode, usdToThbRate: number): number {
  const n = toNumber(value) ?? 0;
  return currency === "USD" ? n * usdToThbRate : n;
}

/** "฿2,000,000 – ฿3,500,000", "from ฿2,000,000", "up to ฿3,500,000", or "". */
export function formatFeeRange(min: Numeric, max: Numeric, currency: CurrencyCode): string {
  const a = formatMoney(min, currency);
  const b = formatMoney(max, currency);
  if (a && b) return a === b ? a : `${a} – ${b}`;
  if (a) return `from ${a}`;
  if (b) return `up to ${b}`;
  return "";
}

/** Compact THB for dashboards: ฿12.5M, ฿850K. */
export function formatThbCompact(value: number): string {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "THB",
    currencyDisplay: "narrowSymbol",
    notation: "compact",
    minimumFractionDigits: 0,
    maximumFractionDigits: 1,
  }).format(value);
}
