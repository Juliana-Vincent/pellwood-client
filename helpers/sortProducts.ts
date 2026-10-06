import { parsePrice } from "@/functions/parsePrice";

/**
 * Catalogue ordering options.
 *
 * "default" is the order Strapi returns: the `sort` field from the admin, with
 * title as a tie-breaker. Only 15 of 115 products have a `sort` value, so for
 * most of the catalogue that is effectively alphabetical.
 */
export type CatalogSort =
  | "default"
  | "price-asc"
  | "price-desc"
  | "title-asc"
  | "title-desc";

export const CATALOG_SORTS: CatalogSort[] = [
  "default",
  "price-asc",
  "price-desc",
  "title-asc",
  "title-desc",
];

/** Anything unrecognised in the URL falls back to the admin's order. */
export function parseCatalogSort(raw: unknown): CatalogSort {
  const value = typeof raw === "string" ? raw : "";
  return (CATALOG_SORTS as string[]).includes(value)
    ? (value as CatalogSort)
    : "default";
}

/**
 * The price the catalogue card shows: the cheapest variant, or the product's own
 * price when it has no variants. Must match components/Cart's getMin, or the list
 * would be ordered by a number the customer cannot see.
 */
export function productPrice(product: any): number {
  if (product?.variants?.length) {
    const prices = product.variants
      .map((variant: any) => parsePrice(variant?.price))
      .filter((price: number) => price > 0);
    if (prices.length) return Math.min(...prices);
  }
  return parsePrice(product?.price);
}

/**
 * Price and title ordering both have to happen here rather than in Strapi.
 *
 * `price` is a string field holding Czech decimal commas, so Postgres would order
 * it lexicographically - "1250" before "890" before "8,9". `title` sorts in the
 * database without Czech collation, which puts Č after Z. Both need the real
 * values, which means sorting the filtered set in memory.
 */
export function sortProducts(
  products: any[],
  sortBy: CatalogSort,
  lang: string,
): any[] {
  if (!Array.isArray(products) || sortBy === "default") return products;

  const sorted = [...products];
  const collator = new Intl.Collator(lang === "en" ? "en" : "cs", {
    numeric: true,
    sensitivity: "base",
  });

  if (sortBy === "title-asc" || sortBy === "title-desc") {
    const direction = sortBy === "title-asc" ? 1 : -1;
    sorted.sort(
      (a, b) =>
        direction * collator.compare(String(a?.title || "").trim(), String(b?.title || "").trim()),
    );
    return sorted;
  }

  const direction = sortBy === "price-asc" ? 1 : -1;
  sorted.sort((a, b) => {
    const priceA = productPrice(a);
    const priceB = productPrice(b);
    // A product whose price Strapi cannot give us goes last either way - an
    // unreadable price must not lead the "cheapest first" list.
    if (priceA <= 0 && priceB <= 0) return collator.compare(a?.title || "", b?.title || "");
    if (priceA <= 0) return 1;
    if (priceB <= 0) return -1;
    if (priceA === priceB) return collator.compare(a?.title || "", b?.title || "");
    return direction * (priceA - priceB);
  });
  return sorted;
}
