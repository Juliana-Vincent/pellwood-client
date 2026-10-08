import { fetchAPI, fetchAllAPI } from "@/lib/strapi";
import { normalizeText, searchTokens } from "@/helpers/normalizeText";
import { CatalogSort, sortProducts } from "@/helpers/sortProducts";
import { productDimension } from "@/helpers/dimensions";

interface FetchCatalogParams {
  lang: string;
  category?: string | false;
  search?: string | false;
  diameterMin?: string | number | false;
  diameterMax?: string | number | false;
  lengthMin?: string | number | false;
  lengthMax?: string | number | false;
  offset: number;
  limit: number;
  sortBy?: CatalogSort;
}

/** config/api.ts maxLimit. A request above this is clamped, not rejected. */
const STRAPI_MAX_LIMIT = 100;


/** Everything a customer might reasonably type to find this product. */
const searchHaystack = (product: any): string =>
  normalizeText(
    [
      product.title,
      product.category?.title,
      ...(product.variants || []).map((v: any) => v.title),
    ]
      .filter(Boolean)
      .join(" "),
  );

export async function fetchCatalogProducts({
  lang,
  category,
  search,
  diameterMin,
  diameterMax,
  lengthMin,
  lengthMax,
  offset,
  limit,
  sortBy = "default",
}: FetchCatalogParams): Promise<any[]> {
  const strapiLocale = lang === "cz" ? "cs" : lang;
  const populate = { category: true, image: true, variants: true, parametrs: true };

  // Paginating without an explicit sort is the bug behind "the catalogue only ever
  // shows 100 of 115 products". Postgres is free to return rows in a different
  // order for each query, so consecutive pages of the infinite scroll overlapped
  // and skipped; the dedupe in pages/produkty/index.tsx then dropped the overlaps,
  // and the skipped products never appeared at all - always the same ones. The
  // secondary key breaks ties when `sort` is unset, which keeps the order stable.
  const sort = ["sort:asc", "title:asc"];
  const hasRangeFilter = !!(diameterMin && diameterMax) || !!(lengthMin && lengthMax);

  // Search and the range filter both have to run in memory. The range values live
  // in a repeatable component and need parsing; search needs accent folding,
  // punctuation folding and multi-token matching, none of which Strapi's
  // $containsi can do ("x line 4 pary" must match "X-Line 4 páry").
  // Ordering by price or title also has to be done here - see sortProducts for
  // why neither can be left to Strapi.
  const needsInMemory = hasRangeFilter || !!search || sortBy !== "default";

  if (!needsInMemory) {
    const filters: Record<string, any> = {};
    if (category && category !== "all") {
      filters.category = { $or: [{ slug: { $eq: category } }, { documentId: { $eq: category } }] };    
    }

    // Strapi clamps pagination[limit] to config/api.ts maxLimit (100) and says
    // nothing about it - the response just comes back short. getServerSideProps
    // asks for `limit: size`, and size grows with the infinite scroll, so once a
    // visitor scrolled past 100 products the catalogue silently stopped there:
    // always the last 15 of 115, in whatever order the list was in. Ask in
    // chunks no larger than the cap instead.
    const out: any[] = [];
    for (let fetched = 0; fetched < limit; fetched += STRAPI_MAX_LIMIT) {
      const chunk = Math.min(STRAPI_MAX_LIMIT, limit - fetched);
      const res = await fetchAPI("products", {
        locale: strapiLocale,
        populate,
        filters,
        sort,
        pagination: { start: offset + fetched, limit: chunk },
      });
      const batch = res.data || [];
      out.push(...batch);
      // Short batch means the catalogue ended; asking again only costs a request.
      if (batch.length < chunk) break;
    }
    return out;
  }

  let products: any[] = await fetchAllAPI("products", {
    locale: strapiLocale,
    populate,
    sort,
  });

  if (category && category !== "all") {
    products = products.filter(
      (p: any) => p.category && (p.category.documentId === category || p.category.slug === category),
    );
  }

  if (search) {
    // Every token must appear, in any order: "4 pary x line" finds the same
    // products as "x line 4 pary".
    const tokens = searchTokens(String(search));

    // "%" or "???" fold to nothing. Skipping the filter made them match every
    // product, which reads as "your search found all 115 items".
    if (!tokens.length) {
      return [];
    }

    if (tokens.length) {
      products = products.filter((p: any) => {
        const haystack = searchHaystack(p);
        return tokens.every((token) => haystack.includes(token));
      });
    }
  }

  const inRange = (value: number | null, min: unknown, max: unknown) =>
    value !== null && value >= parseFloat(String(min)) && value <= parseFloat(String(max));

  if (diameterMin && diameterMax) {
    products = products.filter((p: any) =>
      inRange(productDimension(p, "diameter"), diameterMin, diameterMax),
    );
  }
  if (lengthMin && lengthMax) {
    products = products.filter((p: any) => inRange(productDimension(p, "length"), lengthMin, lengthMax));
  }

  products = sortProducts(products, sortBy, lang);

  return products.slice(offset, offset + limit);
}