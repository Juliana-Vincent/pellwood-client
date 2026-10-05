import { parsePrice } from "@/functions/parsePrice";

/**
 * One place that turns a price into display text.
 *
 * Previously each surface concatenated its own string, which produced "8.90 €",
 * "5.7 €", "from € 14.5" and "€ 20.4" on different pages, and large Czech amounts
 * with no thousands separator ("208050 Kč"). Intl handles the separator, the
 * decimal places and the symbol placement per locale.
 *
 * Czech prices are whole korunas; EUR prices always carry two decimals.
 */
export function formatPrice(value: unknown, lang: string): string {
  const amount = parsePrice(value);
  const isEn = lang === "en";

  return new Intl.NumberFormat(isEn ? "en-IE" : "cs-CZ", {
    style: "currency",
    currency: isEn ? "EUR" : "CZK",
    minimumFractionDigits: isEn ? 2 : 0,
    maximumFractionDigits: isEn ? 2 : 0,
  }).format(amount);
}

/** Line total for a basket row - quantity x unit price. */
export function formatLineTotal(
  unitPrice: unknown,
  quantity: unknown,
  lang: string
): string {
  const qty = Number(quantity);
  return formatPrice(parsePrice(unitPrice) * (Number.isFinite(qty) ? qty : 0), lang);
}
