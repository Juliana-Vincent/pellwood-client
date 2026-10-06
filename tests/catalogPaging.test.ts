import { describe, it, expect, vi, beforeEach } from "vitest";

// Strapi clamps pagination[limit] to maxLimit (100) silently, so a single request
// for 115 products comes back with 100 and no indication that anything was cut.
// This stands in for that behaviour.
const STRAPI_CAP = 100;
const TOTAL = 115;

const fetchAPI = vi.fn(async (_path: string, params: any) => {
  const start = params?.pagination?.start ?? 0;
  const asked = params?.pagination?.limit ?? 25;
  const limit = Math.min(asked, STRAPI_CAP);
  const data = [];
  for (let i = start; i < Math.min(start + limit, TOTAL); i++) {
    data.push({ documentId: `p${i}`, title: `Product ${i}` });
  }
  return { data, meta: { pagination: { total: TOTAL } } };
});

vi.mock("@/lib/strapi", () => ({
  fetchAPI: (path: string, params: any) => fetchAPI(path, params),
  fetchAllAPI: async () => [],
}));

describe("catalogue paging past Strapi's cap", () => {
  beforeEach(() => fetchAPI.mockClear());

  it("returns all 115 when the whole catalogue is asked for at once", async () => {
    const { fetchCatalogProducts } = await import("@/functions/fetchCatalogProducts");
    const products = await fetchCatalogProducts({
      lang: "cz",
      category: "all",
      offset: 0,
      limit: 120,
    });

    // Before chunking this returned exactly 100 - always the last 15 missing,
    // which is what the retest saw as "Timbales, Triko, tympanove palicky".
    expect(products).toHaveLength(TOTAL);
    expect(new Set(products.map((p: any) => p.documentId)).size).toBe(TOTAL);
    expect(fetchAPI.mock.calls.length).toBeGreaterThan(1);
  });

  it("still makes a single request for a normal infinite-scroll page", async () => {
    const { fetchCatalogProducts } = await import("@/functions/fetchCatalogProducts");
    const products = await fetchCatalogProducts({
      lang: "cz",
      category: "all",
      offset: 12,
      limit: 6,
    });

    expect(products).toHaveLength(6);
    expect(fetchAPI).toHaveBeenCalledTimes(1);
    expect(fetchAPI.mock.calls[0][1].pagination).toEqual({ start: 12, limit: 6 });
  });

  it("stops asking once a chunk comes back short", async () => {
    const { fetchCatalogProducts } = await import("@/functions/fetchCatalogProducts");
    await fetchCatalogProducts({ lang: "cz", category: "all", offset: 0, limit: 400 });
    // 100 + 15, then stop - not four chunks.
    expect(fetchAPI).toHaveBeenCalledTimes(2);
  });
});
