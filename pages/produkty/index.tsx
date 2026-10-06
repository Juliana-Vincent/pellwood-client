import Catalog from "@/components/Catalog";
import localize from "@/data/localize";
import { getCatalogProps, resolveCategory } from "@/functions/catalogProps";
import type { GetServerSidePropsContext } from "next";

export async function getServerSideProps(context: GetServerSidePropsContext) {
  const query = context.query || {};
  const category = (query.category as string) || "";

  // Every category used to live here as ?category=<slug>, which is the URL the
  // old site handed to search engines and to anyone who bookmarked a category.
  // Send those on to the page that now owns them, permanently, carrying the rest
  // of the query (search, filters, sort) so a shared link keeps working.
  if (category && category !== "all") {
    const { lang } = localize(context.locale);
    const strapiLocale = lang === "cz" ? "cs" : lang;
    const resolved = await resolveCategory(strapiLocale, category);

    // Only redirect to a page that exists. An unknown slug - a typo, a category
    // deleted in Strapi - falls through to the full catalogue rather than
    // bouncing the visitor to a 404.
    if (resolved) {
      const rest = new URLSearchParams();
      for (const [key, value] of Object.entries(query)) {
        if (key === "category" || typeof value !== "string") continue;
        // size is pagination state; a fresh page starts at the first page.
        if (key === "size") continue;
        rest.set(key, value);
      }
      const suffix = rest.toString();
      return {
        redirect: {
          destination: `/produkty/${resolved.slug}${suffix ? `?${suffix}` : ""}`,
          permanent: true,
        },
      };
    }
  }

  return getCatalogProps(context, null);
}

export default Catalog;
