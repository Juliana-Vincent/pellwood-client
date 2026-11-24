/**
 * An EAN/GTIN as typed into Strapi, checked and cleaned up, or null.
 *
 * Accepts the 8, 12, 13 and 14-digit forms with spaces or dashes in between. A
 * 14-digit code with a leading 0 (how the client's own list writes them,
 * 08594233422460) is the same product as the 13-digit EAN, so it is shortened.
 * A code whose check digit does not add up is a typo, and a wrong GTIN is worse
 * than none: Google and Heureka reject or mispair the item, so it is dropped.
 */
export function validGtin(value: unknown): string | null {
  let digits = String(value ?? "").replace(/[\s-]/g, "");
  if (!/^\d+$/.test(digits)) return null;
  if (digits.length === 14 && digits.startsWith("0")) digits = digits.slice(1);
  if (![8, 12, 13, 14].includes(digits.length)) return null;

  const body = digits.slice(0, -1);
  // Weights 3,1,3,1... counted from the digit next to the check digit.
  const sum = [...body].reverse().reduce((acc, d, i) => acc + Number(d) * (i % 2 === 0 ? 3 : 1), 0);
  return (10 - (sum % 10)) % 10 === Number(digits.slice(-1)) ? digits : null;
}

/** The schema.org property for a GTIN of this length. */
export const gtinProperty = (gtin: string) =>
  gtin.length === 13 ? "gtin13" : gtin.length === 12 ? "gtin12" : gtin.length === 8 ? "gtin8" : "gtin14";
