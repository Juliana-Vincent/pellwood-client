import { describe, it, expect } from "vitest";

describe("titles and descriptions", () => {
  it("keeps the brand whole and cuts the page name at a word", async () => {
    const { clip } = await import("@/helpers/seoText");
    const name = "Pavel Valdman Signature - paličky z bílého habru, 4 páry v dárkové krabičce";
    const title = clip(name, 60 - " | PELLWOOD".length) + " | PELLWOOD";
    // substring(0, 60) used to produce "... | PELLW".
    expect(title.endsWith(" | PELLWOOD")).toBe(true);
    expect(title.length).toBeLessThanOrEqual(60);
    expect(title).toContain("…");
    expect(title).not.toMatch(/\S…\S/);
  });

  it("leaves short text untouched", async () => {
    const { clip } = await import("@/helpers/seoText");
    expect(clip("Paličky 5A", 155)).toBe("Paličky 5A");
  });

  it("flattens Strapi rich text and takes the first non-empty source", async () => {
    const { blocksToText, firstText } = await import("@/helpers/seoText");
    const blocks = [
      { type: "paragraph", children: [{ text: "Habr " }, { text: "a javor." }] },
      { type: "paragraph", children: [{ type: "link", children: [{ text: "Více" }] }] },
    ];
    expect(blocksToText(blocks)).toBe("Habr a javor. Více");
    expect(firstText("", null, blocks)).toBe("Habr a javor. Více");
    expect(firstText(undefined, [])).toBe("");
  });
});

describe("comparison-site feeds", () => {
  const product = (variantRowIds: number[]) => ({
    documentId: "abcdefghijklmnopqrstuvwx",
    title: "5A Medium",
    slug: "5a-medium",
    image: { url: "/uploads/5a.jpg" },
    variants: [
      { id: variantRowIds[0], title: "Hickory", price: "219", inStock: true },
      { id: variantRowIds[1], title: "Javor", price: "239", inStock: false },
      { id: variantRowIds[2], title: "Prototyp", price: "" },
    ],
  });

  it("keeps the same item id when Strapi recreates the variant rows on publish", async () => {
    const { feedModel } = await import("@/functions/feedModel");
    const before = feedModel("cz", [product([11, 12, 13])]).map((i) => i.id);
    const after = feedModel("cz", [product([901, 902, 903])]).map((i) => i.id);
    expect(after).toEqual(before);
    // Heureka's ITEM_ID limit.
    for (const id of before) expect(id.length).toBeLessThanOrEqual(36);
  });

  it("drops unpriced variants and reports stock per variant", async () => {
    const { feedModel, inStockOnly } = await import("@/functions/feedModel");
    const items = feedModel("cz", [product([1, 2, 3])]);
    expect(items.map((i) => i.title)).toEqual(["5A Medium - Hickory", "5A Medium - Javor"]);
    expect(items.map((i) => i.availability)).toEqual(["in_stock", "out_of_stock"]);
    expect(inStockOnly(items).map((i) => i.title)).toEqual(["5A Medium - Hickory"]);
  });
});

describe("sitemap entries", () => {
  it("adds lastmod from Strapi's updatedAt", async () => {
    const { sitemapEntry } = await import("@/helpers/sitemap");
    expect(sitemapEntry("https://pellwood.com", "/produkt/5a", "2026-10-06T14:03:11.123Z")).toBe(
      "  <url>\n    <loc>https://pellwood.com/produkt/5a</loc>\n    <lastmod>2026-10-06</lastmod>\n  </url>",
    );
  });

  it("omits lastmod when there is no date and escapes the location", async () => {
    const { sitemapEntry } = await import("@/helpers/sitemap");
    const entry = sitemapEntry("https://pellwood.com", "/produkt/a&b");
    expect(entry).toContain("<loc>https://pellwood.com/produkt/a&amp;b</loc>");
    expect(entry).not.toContain("lastmod");
  });
});
