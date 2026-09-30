import { fetchAPI, fetchAllAPI } from "@/lib/strapi";
import { normalizeText, searchTokens } from "@/helpers/normalizeText";

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
}

const findParam = (parametrs: any[] | undefined, titles: string[]) =>
  parametrs?.find((o: any) => titles.includes(o.title));

const parseParamValue = (value: string) => parseFloat(String(value).replace(",", "."));

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
}: FetchCatalogParams): Promise<any[]> {
  const strapiLocale = lang === "cz" ? "cs" : lang;
  const populate = { category: true, image: true, variants: true, parametrs: true };
  const hasRangeFilter = !!(diameterMin && diameterMax) || !!(lengthMin && lengthMax);

  // Search and the range filter both have to run in memory. The range values live
  // in a repeatable component and need parsing; search needs accent folding,
  // punctuation folding and multi-token matching, none of which Strapi's
  // $containsi can do ("x line 4 pary" must match "X-Line 4 páry").
  const needsInMemory = hasRangeFilter || !!search;

  if (!needsInMemory) {
    const filters: Record<string, any> = {};
    if (category && category !== "all") {
      filters.category = { documentId: { $eq: category } };
    }

    const res = await fetchAPI("products", {
      locale: strapiLocale,
      populate,
      filters,
      pagination: { start: offset, limit },
    });
    return res.data || [];
  }

  let products: any[] = await fetchAllAPI("products", {
    locale: strapiLocale,
    populate,
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
    if (tokens.length) {
      products = products.filter((p: any) => {
        const haystack = searchHaystack(p);
        return tokens.every((token) => haystack.includes(token));
      });
    }
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