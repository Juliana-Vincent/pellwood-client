import { describe, it, expect, vi } from "vitest";

// One product: an in-stock variant and an out-of-stock one.
vi.mock("@/lib/strapi", () => ({
  fetchAPI: async (path: string) => {
    if (path === "setting") {
      return {
        data: {
          deliveryOptions: [{ label: "PPL", price: 150 }],
          paymentOptions: [{ label: "Dobirka", price: 30, payOnline: false }],
        },
      };
    }
    return {
      data: [
        {
          documentId: "prod1",
          title: "5A Medium",
          image: null,
          variants: [
            { title: "Hickory", price: "219", inStock: true },
            { title: "Javor", price: "239", inStock: false },
          ],
        },
      ],
    };
  },
  fetchAllAPI: async () => [],
  urlFor: () => ({ url: () => "" }),
}));

const delivery = { value: "PPL", price: "" };
const payment = { value: "Dobirka", price: "" };

describe("stock is enforced, not only displayed", () => {
  it("refuses an out-of-stock variant at order time", async () => {
    const { computeAuthoritativeOrderTotal, OrderValidationError } = await import(
      "@/functions/validateOrder"
    );
    await expect(
      computeAuthoritativeOrderTotal(
        [{ id: "prod1", variantName: "Javor", countVariant: 1 }],
        delivery,
        payment,
        "Kč",
        "cz",
      ),
    ).rejects.toBeInstanceOf(OrderValidationError);
  });

  it("still accepts the in-stock one", async () => {
    const { computeAuthoritativeOrderTotal } = await import("@/functions/validateOrder");
    const { basket } = await computeAuthoritativeOrderTotal(
      [{ id: "prod1", variantName: "Hickory", countVariant: 1 }],
      delivery,
      payment,
      "Kč",
      "cz",
    );
    expect(basket[0].variantPrice).toBe(219);
  });

  it("checkout's re-pricing flags an out-of-stock line as unavailable", async () => {
    const { default: handler } = await import("@/pages/api/basket/convert");
    const res: any = {
      statusCode: 0,
      body: undefined as any,
      setHeader() { return this; },
      status(c: number) { this.statusCode = c; return this; },
      json(b: any) { this.body = b; return this; },
      end() { return this; },
    };
    await handler(
      {
        method: "POST",
        body: {
          fromLang: "cz",
          toLang: "cz",
          items: [
            { id: "prod1", variantName: "Hickory", variantPrice: 200, countVariant: 1 },
            { id: "prod1", variantName: "Javor", variantPrice: 239, countVariant: 1 },
          ],
        },
      } as any,
      res,
    );
    const [inStock, outOfStock] = res.body.items;
    // Same language, so this is purely "today's price and availability".
    expect(inStock.unavailable).toBe(false);
    expect(inStock.variantPrice).toBe(219);
    expect(outOfStock.unavailable).toBe(true);
  });
});

describe("restoring the basket from localStorage", () => {
  it("rejects values that parse as JSON but are not a basket", async () => {
    const { asBasket } = await import("@/helpers/storedState");
    expect(asBasket(null)).toBeUndefined();
    expect(asBasket({})).toBeUndefined();
    expect(asBasket("x")).toBeUndefined();
  });

  it("keeps the good lines of a damaged basket", async () => {
    const { asBasket } = await import("@/helpers/storedState");
    // [null] used to crash the mini-cart on every page.
    expect(
      asBasket([null, 7, { id: "a", countVariant: 2 }, { id: "b", countVariant: 0 }, { countVariant: 1 }]),
    ).toEqual([{ id: "a", countVariant: 2 }]);
  });

  it("only accepts a sane counter and a plain object for the user", async () => {
    const { asCount, asObject } = await import("@/helpers/storedState");
    expect(asCount(3)).toBe(3);
    expect(asCount(-1)).toBeUndefined();
    expect(asCount("3")).toBeUndefined();
    expect(asObject([])).toBeUndefined();
    expect(asObject({ email: "x" })).toEqual({ email: "x" });
  });
});

describe("infinite scroll does not stack history entries", () => {
  it("replaces the URL for a scroll step, pushes for a real navigation", async () => {
    const { default: changeUrl } = await import("@/helpers/changeUrl");
    const router: any = {
      pathname: "/produkty",
      query: { size: "6" },
      push: vi.fn(),
      replace: vi.fn(),
    };
    changeUrl(12, false, false, [], router, false, "replace");
    expect(router.replace).toHaveBeenCalledTimes(1);
    expect(router.push).not.toHaveBeenCalled();

    changeUrl(6, false, "5a", {}, router);
    expect(router.push).toHaveBeenCalledTimes(1);
  });
});
