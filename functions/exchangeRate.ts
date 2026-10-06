import { fetchAPI } from "@/lib/strapi";
import { parsePrice } from "@/functions/parsePrice";

export type Lang = "cz" | "en";

export const otherLang = (lang: Lang): Lang => (lang === "cz" ? "en" : "cz");
export const strapiLocale = (lang: Lang) => (lang === "cz" ? "cs" : "en");

/** CZK per 1 EUR from Setting -> eurCzkRate (shared by both locales). 0 = not set. */
export function readRate(setting: { eurCzkRate?: unknown } | undefined | null): number {
  const rate = parsePrice(setting?.eurCzkRate);
  return rate > 0 ? rate : 0;
}

export async function fetchRate(): Promise<number> {
  try {
    const res = await fetchAPI("setting", { locale: "cs", fields: ["eurCzkRate"] });
    return readRate(res.data as any);
  } catch (err) {
    console.error("Failed to fetch eurCzkRate:", err);
    return 0;
  }
}

/** Basket and order both use this, so the shown price and the charged price match. */
export function convertPrice(price: number, from: Lang, to: Lang, rate: number): number {
  if (from === to) return price;
  if (!(rate > 0) || !(price > 0)) return 0;
  return to === "en"
    ? Math.round((price / rate) * 100) / 100
    : Math.round(price * rate);
}

/** Price of an in-stock variant matched by title (or of a variant-less product). */
export function priceOf(product: any, variantName?: string) {
  if (product.variants?.length) {
    const variant = product.variants.find((v: any) => v.title === variantName);
    if (!variant || variant.inStock === false) return null;
    const price = parsePrice(variant.price);
    return price > 0 ? { variantName: variant.title as string, price } : null;
  }
  const price = parsePrice(product.price);
  return price > 0 ? { variantName: product.title as string, price } : null;
}
