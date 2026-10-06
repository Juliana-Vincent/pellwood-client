import { describe, it, expect, vi, beforeEach } from "vitest";

// "hoodie" exists only in Czech, "sticks" in both locales.
let rate: number | null = 25;
vi.mock("@/lib/strapi", () => ({
  fetchAPI: async (path: string, params: any) => {
    if (path === "setting") {
      return {
        data: {
          eurCzkRate: rate,
          deliveryOptions: [{ label: params.locale === "cs" ? "PPL" : "DPD", price: 150 }],
          paymentOptions: [{ label: "Card", price: 0, payOnline: true }],
        },
      };
    }
    const ids: string[] = params.filters.documentId.$in;
    const all =
      params.locale === "cs"
        ? [
            { documentId: "hoodie", title: "Mikina", image: null, variants: [{ title: "M", price: "799", inStock: true }, { title: "XL", price: "799", inStock: false }] },
            { documentId: "sticks", title: "5A", image: null, variants: [{ title: "Hickory", price: "219", inStock: true }] },
          ]
        : [{ documentId: "sticks", title: "5A", image: null, variants: [{ title: "Hickory", price: "8.90", inStock: true }] }];
    return { data: all.filter((p) => ids.includes(p.documentId)) };
  },
  fetchAllAPI: async () => [],
  urlFor: () => ({ url: () => "" }),
}));

const convert = async (items: any[], fromLang: string, toLang: string) => {
  const { default: handler } = await import("@/pages/api/basket/convert");
  const res: any = {
    setHeader() { return this; },
    status() { return this; },
    json(b: any) { this.body = b; return this; },
    end() { return this; },
  };
  await handler({ method: "POST", body: { items, fromLang, toLang } } as any, res);
  return res.body.items;
};

const hoodie = { id: "hoodie", nameProduct: "Mikina", variantName: "M", variantPrice: 799, countVariant: 1 };
const sticks = { id: "sticks", nameProduct: "5A", variantName: "Hickory", variantPrice: 219, countVariant: 1 };

beforeEach(() => { rate = 25; });

describe("products that exist in one locale only", () => {
  it("converts the rate both ways with the shop's rounding", async () => {
    const { convertPrice } = await import("@/functions/exchangeRate");
    expect(convertPrice(799, "cz", "en", 25)).toBe(31.96);
    expect(convertPrice(799, "cz", "en", 24.3)).toBe(32.88);
    expect(convertPrice(31.96, "en", "cz", 24.3)).toBe(777);
    expect(convertPrice(799, "cz", "en", 0)).toBe(0);
  });

  it("are priced in euros instead of keeping the koruna number", async () => {
    const [h, s] = await convert([hoodie, sticks], "cz", "en");
    expect(h).toMatchObject({ unavailable: false, variantPrice: 31.96, nameProduct: "Mikina" });
    // Products with an English version still use their own English price.
    expect(s).toMatchObject({ unavailable: false, variantPrice: 8.9 });
  });

  it("keep the same price when checkout re-prices them in English", async () => {
    const [h] = await convert([{ ...hoodie, variantPrice: 31.96 }], "en", "en");
    expect(h).toMatchObject({ unavailable: false, variantPrice: 31.96 });
  });

  it("stay greyed out without a rate or when out of stock", async () => {
    rate = null;
    expect((await convert([hoodie], "cz", "en"))[0].unavailable).toBe(true);
    rate = 25;
    expect((await convert([{ ...hoodie, variantName: "XL" }], "cz", "en"))[0].unavailable).toBe(true);
  });

  it("the order is charged exactly what the basket showed", async () => {
    const { computeAuthoritativeOrderTotal } = await import("@/functions/validateOrder");
    const { basket } = await computeAuthoritativeOrderTotal(
      [{ id: "hoodie", variantName: "M", countVariant: 2 }, { id: "sticks", variantName: "Hickory", countVariant: 1 }],
      { value: "DPD", price: "" },
      { value: "Card", price: "" },
      "€",
      "de",
    );
    expect(basket.map((i: any) => i.variantPrice)).toEqual([31.96, 8.9]);
  });

  it("the order refuses them when no rate is set", async () => {
    rate = null;
    const { computeAuthoritativeOrderTotal, OrderValidationError } = await import("@/functions/validateOrder");
    await expect(
      computeAuthoritativeOrderTotal(
        [{ id: "hoodie", variantName: "M", countVariant: 1 }],
        { value: "DPD", price: "" },
        { value: "Card", price: "" },
        "€",
        "de",
      ),
    ).rejects.toBeInstanceOf(OrderValidationError);
  });
});
