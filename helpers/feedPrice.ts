import { parsePrice } from "@/functions/parsePrice";

// Google Merchant rejects "4,50 EUR" - the decimal separator must be a dot, and
// Strapi stores EN prices with the Czech comma. Lives here rather than in feed.ts
// because that module runs the generator on import.
export const feedPrice = (value: unknown, lang: string): string =>
  `${parsePrice(value).toFixed(2)} ${lang === "cz" ? "CZK" : "EUR"}`;

export const slugify = (value: string): string =>
  String(value).toLowerCase().trim().replace(/\s+/g, "-");
