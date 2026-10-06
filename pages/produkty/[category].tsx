import Catalog from "@/components/Catalog";
import localize from "@/data/localize";
import { getCatalogProps, resolveCategory } from "@/functions/catalogProps";
import type { GetServerSidePropsContext } from "next";

export async function getServerSideProps(context: GetServerSidePropsContext) {
  const slug = String(context.params?.category || "");
  const { lang } = localize(context.locale);
  const strapiLocale = lang === "cz" ? "cs" : lang;

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
