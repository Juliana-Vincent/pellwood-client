import { fetchAPI, fetchAllAPI } from "@/lib/strapi";
import localize from "@/data/localize";
import controledProduct from "@/helpers/controlledProduct";
import getRangeParameter from "@/helpers/getRangeParameter";
import shuffle from "@/helpers/shuffle";
import { parseCatalogSort } from "@/helpers/sortProducts";
import { fetchCatalogProducts } from "@/functions/fetchCatalogProducts";
import type { Product } from "@/types/product";
import type { Category } from "@/types/category";
import type { Setting } from "@/types/setting";
import type { Article } from "@/types/article";
import type { GetServerSidePropsContext } from "next";

// Shared by /produkty and /produkty/[category]. The category used to come from
// the query string; it now comes from the caller, which is the whole point of
// C5 - a category is a page, not a filter state.

/** A category as the route needs it, with its counterpart slug in the other locale. */
export interface ResolvedCategory {
  documentId: string;
  slug: string;
  title: string;
  csSlug: string | null;
  enSlug: string | null;
}

/**
 * Finds a category by slug *within one locale*. The slug field is localized, so
 * the Czech and English slugs for the same category are different strings - the
 * pair has to be matched through documentId via localizations, never by assuming
 * the slug is the same in both.
 */
export async function resolveCategory(
  strapiLocale: string,
  slug: string,
): Promise<ResolvedCategory | null> {
  const res = await fetchAPI<Category[]>("categories", {
    locale: strapiLocale,
    filters: { slug: { $eq: slug } },
    populate: { localizations: true },
  });
  const category: any = (res.data || [])[0];
  if (!category) return null;

  const localizations = (category.localizations || []) as Array<{
    locale: string;
    slug: string;
  }>;
  const own = strapiLocale === "en" ? "en" : "cs";
  const other = own === "en" ? "cs" : "en";
  const otherSlug = localizations.find((l) => l.locale === other)?.slug || null;

  return {
    documentId: category.documentId,
    slug: category.slug,
    title: category.title,
    csSlug: own === "cs" ? category.slug : otherSlug,
    enSlug: own === "en" ? category.slug : otherSlug,
  };
}


interface FilterParams {
  lengthMin: string | number;
  lengthMax: string | number;
  diameterMin: string | number;
  diameterMax: string | number;
}

export async function getCatalogProps(
  context: GetServerSidePropsContext,
  resolved?: ResolvedCategory | null,
) {
  const { lang, currency } = localize(context.locale);
  const strapiLocale = lang === "cz" ? "cs" : lang;

  const query = context.query || {};
  // "all" is the unfiltered catalogue at /produkty; anything else arrived as a
  // path segment and has already been looked up by the route.
  const category = resolved?.slug || "all";
  // `size` comes straight from the URL and flowed into Strapi's pagination
  // untouched, so /produkty?size=abc sent pagination[limit]=NaN. Clamp it.
  const parsedSize = parseInt((query.size as string) || "6", 10);
  const size = Number.isFinite(parsedSize)
    ? Math.min(Math.max(parsedSize, 6), 120)
    : 6;
  const search = (query.search as string) || "";
  const sortBy = parseCatalogSort(query.sort);
  const diameterMin = (query.diameterMin as string) || false;
  const diameterMax = (query.diameterMax as string) || false;
  const lengthMin = (query.lengthMin as string) || false;
  const lengthMax = (query.lengthMax as string) || false;

  let parametersArr: FilterParams | false = false;
  if (lengthMin && lengthMax && diameterMin && diameterMax) {
    parametersArr = { lengthMin, lengthMax, diameterMin, diameterMax };
  }

  const strapiLocale2 = lang === "cz" ? "cs" : lang;
  const rangeProducts = await fetchAllAPI<Product>("products", {
    locale: strapiLocale2,
    populate: { parametrs: true },
  });
  const range = getRangeParameter(rangeProducts);
  const rangeState = getRangeParameter(rangeProducts, parametersArr);

  const productsSliced = await fetchCatalogProducts({
    lang,
    category,
    search,
    diameterMin,
    diameterMax,
    lengthMin,
    lengthMax,
    offset: 0,
    limit: size,
    sortBy,
  });
  const products = await controledProduct(lang, productsSliced);

  const categoriesRes = await fetchAPI<Category[]>("categories", {
    locale: strapiLocale,
    sort: ["sort:asc"],
  });
  const categoriesData = categoriesRes.data || [];

  const articlesRes = await fetchAPI<Article[]>("articles", {
    locale: strapiLocale,
    populate: { category: true, image: true },
  });
  const articlesData = articlesRes.data || [];

  const settingsRes = await fetchAPI<Setting>("setting", {
    locale: strapiLocale,
  });
  const settingsData: Partial<Setting> = settingsRes.data || {};

  const ifFiltered = !!search.length || !!parametersArr;

  return {
    props: {
      category: categoriesData,
      settings: settingsData,
      articleFirst: shuffle(
        articlesData.filter((item) => item?.category?.slug === "sluzby"),
        0,
      ),
      articleSeccond: shuffle(
        articlesData.filter((item) => item?.category?.slug === "o-nas"),
        1,
      ),
      lang,
      currency,
      productData: products,
      range,
      rangeState,
      ifFiltered,
      searchQuery: search,
      sortBy,
      alternates: resolved
        ? {
            cs: resolved.csSlug ? `/produkty/${resolved.csSlug}` : null,
            en: resolved.enSlug ? `/produkty/${resolved.enSlug}` : null,
          }
        : { cs: "/produkty", en: "/produkty" },
    },
  };
}
