import Catalog from "@/components/Catalog";
import localize from "@/data/localize";
import { getCatalogProps, resolveCategory } from "@/functions/catalogProps";
import type { GetServerSidePropsContext } from "next";

export async function getServerSideProps(context: GetServerSidePropsContext) {
  const slug = String(context.params?.category || "");
  const { lang } = localize(context.locale);
  const strapiLocale = lang === "cz" ? "cs" : lang;

  // A search always covers the whole catalogue. It used to stay inside the
  // category you happened to be on, with nothing in the search window saying so -
  // searching "woody" from Palicky found nothing although the product exists.
  // Sending the search to /produkty also keeps the page honest: a category title
  // over results from other categories would be wrong.
  const search = typeof context.query.search === "string" ? context.query.search.trim() : "";
  if (search) {
    const rest = new URLSearchParams();
    for (const [key, value] of Object.entries(context.query)) {
      // `category` here is the route segment, not a query parameter.
      if (key === "category" || typeof value !== "string") continue;
      rest.set(key, value);
    }
    // Destinations are used verbatim in this Next version, so the locale has to
    // be in the string - see pages/produkty/index.tsx.
    const localePrefix =
      context.locale && context.locale !== context.defaultLocale ? `/${context.locale}` : "";
    return {
      // Not permanent: this is a search result, not a URL that has moved.
      redirect: { destination: `${localePrefix}/produkty?${rest.toString()}`, permanent: false },
    };
  }

  const resolved = await resolveCategory(strapiLocale, slug);

  // A slug that is not a category in THIS locale is a 404, not an empty
  // catalogue - returning the full product list under a made-up URL would let
  // every typo become an indexable duplicate of /produkty.
  if (!resolved) {
    return { notFound: true };
  }

  return getCatalogProps(context, resolved);
}

export default Catalog;
