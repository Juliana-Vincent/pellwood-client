import { fetchAPI } from "@/lib/strapi";

interface FetchCatalogParams {
  lang: string;
  category?: string | false;
  search?: string | false;
  diameterMin?: string | number | false;
  diameterMax?: string | number | false;
  lengthMin?: string | number | false;
  lengthMax?: string | number | false;
  /** Zero-based index of the first item to return within the filtered result set. */
  offset: number;
  /** How many items to return starting at offset. */
  limit: number;
}

const findParam = (parametrs: any[] | undefined, titles: string[]) =>
  parametrs?.find((o: any) => titles.includes(o.title));

const parseParamValue = (value: string) => parseFloat(String(value).replace(",", "."));

/**
 * Single source of truth for the product catalog listing, shared between the
 * initial getServerSideProps render and the client-side "load more"/filter calls -
 * they used to duplicate this filtering logic independently.
 *
 * Category and search map cleanly onto Strapi filters, so that case is pushed
 * server-side with real pagination instead of pulling up to 1000 products on every
 * request. Strapi can't filter on values inside a repeatable component though, so a
 * diameter/length range filter still has to be evaluated in-memory - that path
 * fetches a bounded working set (not the whole catalog) and paginates in JS.
 */
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
}: FetchCatalogParams): Promise<any[]> {
  const strapiLocale = lang === "cz" ? "cs" : lang;
  const populate = { category: true, image: true, variants: true, parametrs: true };
  const hasRangeFilter = !!(diameterMin && diameterMax) || !!(lengthMin && lengthMax);

  if (!hasRangeFilter) {
    const filters: Record<string, any> = {};
    if (category && category !== "all") {
      filters.category = { documentId: { $eq: category } };
    }
    if (search) {
      filters.title = { $containsi: search };
    }

    const res = await fetchAPI("products", {
      locale: strapiLocale,
      populate,
      filters,
      pagination: { start: offset, limit },
    });
    return res.data || [];
  }

  // A reasonable cap on the working set for the in-memory range-filter fallback -
  // note Strapi's own pagination[limit] may already be capped server-side (commonly
  // a few hundred by default), so this can silently work against a partial catalog
  // until that's raised or the range filter is moved into a Strapi controller.
  const WORKING_SET_LIMIT = 500;

  const res = await fetchAPI("products", {
    locale: strapiLocale,
    populate,
    pagination: { limit: WORKING_SET_LIMIT },
  });
  let products = res.data || [];

  if (category && category !== "all") {
    products = products.filter(
      (p: any) => p.category && (p.category.documentId === category || p.category.slug === category),
    );
  }
  if (search) {
    const s = String(search).toLowerCase();
    products = products.filter((p: any) => p.title && p.title.toLowerCase().includes(s));
  }
  if (diameterMin && diameterMax) {
    products = products.filter((p: any) => {
      const d = findParam(p.parametrs, ["Průměr", "Diameter"]);
      if (!d) return false;
      const val = parseParamValue(d.value);
      return val >= parseFloat(String(diameterMin)) && val <= parseFloat(String(diameterMax));
    });
  }
  if (lengthMin && lengthMax) {
    products = products.filter((p: any) => {
      const l = findParam(p.parametrs, ["Délka", "Length"]);
      if (!l) return false;
      const val = parseParamValue(l.value);
      return val >= parseFloat(String(lengthMin)) && val <= parseFloat(String(lengthMax));
    });
  }

  return products.slice(offset, offset + limit);
}
