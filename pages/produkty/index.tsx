import Catalog from "@/components/Catalog";
import localize from "@/data/localize";
import { getCatalogProps, resolveCategory } from "@/functions/catalogProps";
import type { GetServerSidePropsContext } from "next";

export async function getServerSideProps(context: GetServerSidePropsContext) {
  const query = context.query || {};
  const category = (query.category as string) || "";

  // Strips ?category= and ?size= from the query, keeping search, filters and sort
  // so a shared link still lands on what the sender was looking at. size is
  // pagination state; a fresh page starts at the first page.
  const restOfQuery = () => {
    const rest = new URLSearchParams();
    for (const [key, value] of Object.entries(query)) {
      if (key === "category" || key === "size" || typeof value !== "string") continue;
      rest.set(key, value);
    }
    const suffix = rest.toString();
    return suffix ? `?${suffix}` : "";
  };

  // The header used to link to /produkty?size=6&category=all, so that URL is out
  // in the wild and possibly indexed. It renders the same page as /produkty, and
  // two URLs for one page is exactly what the canonical tag exists to paper over -
  // better to have only one.
  if (category === "all") {
    return {
      redirect: { destination: `/produkty${restOfQuery()}`, permanent: true },
    };
  }

  // Every category used to live here as ?category=<slug>, which is the URL the
  // old site handed to search engines and to anyone who bookmarked a category.
  // Send those on to the page that now owns them, permanently, carrying the rest
  // of the query (search, filters, sort) so a shared link keeps working.
  if (category) {
    const { lang } = localize(context.locale);
    const strapiLocale = lang === "cz" ? "cs" : lang;
    const resolved = await resolveCategory(strapiLocale, category);

    // Only redirect to a page that exists. An unknown slug - a typo, a category
    // deleted in Strapi - falls through to the full catalogue rather than
    // bouncing the visitor to a 404.
    if (resolved) {
      return {
        redirect: {
          destination: `/produkty/${resolved.slug}${restOfQuery()}`,
          permanent: true,
        },
      };
    }
  }

  return getCatalogProps(context, null);
}

export default Catalog;
