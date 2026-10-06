import { describe, it, expect, vi } from "vitest";

// The category slug is localized: the same category is "palicky" in CS and
// "first-class-drumsticks" in EN, so lookups must be per locale.
const SLUGS: Record<string, string[]> = {
  cs: ["palicky", "x-line"],
  en: ["first-class-drumsticks", "x-line"],
};

vi.mock("@/functions/catalogProps", () => ({
  resolveCategory: async (locale: string, slug: string) =>
    SLUGS[locale]?.includes(slug)
      ? { documentId: "d", slug, title: slug, description: "", csSlug: slug, enSlug: slug }
      : null,
  getCatalogProps: async () => ({ props: { rendered: true } }),
}));

// The page component pulls in UIkit and the whole catalogue UI; only the data
// function is under test here.
vi.mock("@/components/Catalog", () => ({ default: () => null }));

const ctx = (locale: string, query: Record<string, string>, params?: Record<string, string>) =>
  ({ locale, defaultLocale: "cs", query: { ...query, ...(params || {}) }, params }) as any;

describe("catalogue redirects keep the visitor's language", () => {
  // Next 16 sends a redirect destination verbatim - it does not add the locale.
  // Every one of these used to drop English visitors onto the Czech site.

  it("sends the old EN 'all products' link to the EN catalogue", async () => {
    const { getServerSideProps } = await import("@/pages/produkty/index");
    const res: any = await getServerSideProps(ctx("en", { category: "all", size: "6" }));
    expect(res.redirect.destination).toBe("/en/produkty");
  });

  it("keeps the CS one unprefixed", async () => {
    const { getServerSideProps } = await import("@/pages/produkty/index");
    const res: any = await getServerSideProps(ctx("cs", { category: "all" }));
    expect(res.redirect.destination).toBe("/produkty");
  });

  it("sends an old EN ?category= link to the EN category page", async () => {
    const { getServerSideProps } = await import("@/pages/produkty/index");
    const res: any = await getServerSideProps(ctx("en", { category: "first-class-drumsticks" }));
    // Without the prefix this went to the Czech route, where the English slug 404s.
    expect(res.redirect.destination).toBe("/en/produkty/first-class-drumsticks");
  });

  it("carries search and sort through, drops pagination", async () => {
    const { getServerSideProps } = await import("@/pages/produkty/index");
    const res: any = await getServerSideProps(
      ctx("cs", { category: "palicky", search: "5a", sort: "price-asc", size: "24" }),
    );
    expect(res.redirect.destination).toBe("/produkty/palicky?search=5a&sort=price-asc");
  });
});

describe("search on a category page covers the whole catalogue", () => {
  it("redirects to the catalogue in the same language", async () => {
    const { getServerSideProps } = await import("@/pages/produkty/[category]");
    const res: any = await getServerSideProps(
      ctx("en", { search: "woody", size: "6" }, { category: "first-class-drumsticks" }),
    );
    expect(res.redirect.permanent).toBe(false);
    expect(res.redirect.destination.startsWith("/en/produkty?")).toBe(true);
    const params = new URLSearchParams(res.redirect.destination.split("?")[1]);
    expect(params.get("search")).toBe("woody");
    // The route segment must not come along as a query parameter.
    expect(params.has("category")).toBe(false);
  });

  it("renders the category normally without a search", async () => {
    const { getServerSideProps } = await import("@/pages/produkty/[category]");
    const res: any = await getServerSideProps(ctx("cs", {}, { category: "palicky" }));
    expect(res.props?.rendered).toBe(true);
  });

  it("404s a slug from the other locale", async () => {
    const { getServerSideProps } = await import("@/pages/produkty/[category]");
    const res: any = await getServerSideProps(ctx("en", {}, { category: "palicky" }));
    expect(res.notFound).toBe(true);
  });
});
