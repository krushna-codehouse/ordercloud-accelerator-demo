// Currency formatting. The seeded catalog prices in AUD; we default to that
// but honour whatever currency OrderCloud returns on the product/order.

const LOCALE_BY_CURRENCY: Record<string, string> = {
  AUD: "en-AU",
  USD: "en-US",
  GBP: "en-GB",
  EUR: "en-IE",
  NZD: "en-NZ",
  CAD: "en-CA",
};

export function formatPrice(
  amount?: number | null,
  currency = "AUD",
): string {
  if (typeof amount !== "number" || Number.isNaN(amount)) return "";
  const code = currency || "AUD";
  const locale = LOCALE_BY_CURRENCY[code] ?? "en-AU";
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: code,
    currencyDisplay: "symbol",
  }).format(amount);
}
