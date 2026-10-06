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
  /** Flattened from the category's rich-text description, for the meta tag. */
  description: string;
  csSlug: string | null;
  enSlug: string | null;
}

/** Strapi blocks -> plain text, for a meta description. */
function flattenBlocks(blocks: any): string {
  if (!Array.isArray(blocks)) return "";
  const walk = (node: any): string => {
    if (!node) return "";
    if (typeof node.text === "string") return node.text;
    if (Array.isArray(node.children)) return node.children.map(walk).join("");
    return "";
  };
  return blocks.map(walk).join(" ").replace(/\s+/g, " ").trim();
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
    description: flattenBlocks(category.description),
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

  // Everything below follows one rule: the product list is essential, everything
  // else on this page is decoration. A failure fetching the products must stay a
  // 500 - answering 200 with an empty grid tells a customer the shop is empty and
  // tells Google the same, which is worse than an honest error. The filter bounds,
  // the category menu, the footer articles and the CMS settings are all things the
  // page can render without, so none of them may take it down.
  const strapiLocale2 = lang === "cz" ? "cs" : lang;
  let rangeProducts: Product[] = [];
  try {
    rangeProducts = await fetchAllAPI<Product>("products", {
      locale: strapiLocale2,
      populate: { parametrs: true },
    });
  } catch (err) {
    console.error("Strapi unreachable (filter ranges):", (err as Error).message);
  }
  // getRangeParameter already returns zeroed bounds for an empty list.
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

  let categoriesData: Category[] = [];
  try {
    const categoriesRes = await fetchAPI<Category[]>("categories", {
      locale: strapiLocale,
      sort: ["sort:asc"],
    });
    categoriesData = categoriesRes.data || [];
  } catch (err) {
    console.error("Strapi unreachable (categories):", (err as Error).message);
  }

  let articlesData: Article[] = [];
  try {
    const articlesRes = await fetchAPI<Article[]>("articles", {
      locale: strapiLocale,
      populate: { category: true, image: true },
    });
    articlesData = articlesRes.data || [];
  } catch (err) {
    console.error("Strapi unreachable (catalogue articles):", (err as Error).message);
  }

  // resolvePricingRules falls back to the hardcoded defaults for an empty object,
  // and Page falls back to the default title and description.
  let settingsData: Partial<Setting> = {};
  try {
    const settingsRes = await fetchAPI<Setting>("setting", {
      locale: strapiLocale,
    });
    settingsData = settingsRes.data || {};
  } catch (err) {
    console.error("Strapi unreachable (catalogue settings):", (err as Error).message);
  }

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
      // A category page used to take its title, H1 and description from the
      // catalogue settings, so all four read "Prvotridni bubenicke palicky
      // PELLWOOD" - four URLs claiming to be the same page.
      activeCategory: resolved
        ? { title: resolved.title, description: resolved.description }
        : null,
      alternates: resolved
        ? {
            cs: resolved.csSlug ? `/produkty/${resolved.csSlug}` : null,
            en: resolved.enSlug ? `/produkty/${resolved.enSlug}` : null,
          }
        : { cs: "/produkty", en: "/produkty" },
    },
  };
}
