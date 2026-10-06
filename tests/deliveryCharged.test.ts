import { describe, it, expect } from "vitest";
import { computePricing } from "@/functions/computePricing";
import { parsePrice } from "@/functions/parsePrice";
import gtag from "@/functions/gtag";
import { feedPrice } from "@/helpers/feedPrice";

// These cover the three places where what the customer was *shown* and what the
// order record *claimed* had drifted apart. None of it was covered before.

describe("deliveryCharged", () => {
  it("reports the delivery that was actually added below the threshold", () => {
    const { total, deliveryCharged } = computePricing(1000, "150 Kč", 0, "cz");
    expect(deliveryCharged).toBe(150);
    expect(total).toBe(1150);
  });

  it("reports 0 when the free-delivery threshold waived it", () => {
    // The confirmation email, GA4 and the zbozi.cz conversion all read this as
    // "shipping" - the option's 150 Kc list price made every free-shipping order
    // look like it had paid for delivery.
    const { total, deliveryCharged } = computePricing(1600, "150 Kč", 0, "cz");
    expect(deliveryCharged).toBe(0);
    expect(total).toBe(1600);
  });

  it("charges delivery exactly at the threshold, free only strictly above", () => {
    expect(computePricing(1500, "150 Kč", 0, "cz").deliveryCharged).toBe(150);
    expect(computePricing(1501, "150 Kč", 0, "cz").deliveryCharged).toBe(0);
  });

  it("handles the EUR side, where prices carry a decimal comma", () => {
    const { deliveryCharged, total } = computePricing(50, "10 €", 0, "en");
    expect(deliveryCharged).toBe(10);
    expect(total).toBe(60);
  });
});

describe("parsePrice", () => {
  it("reads the Czech decimal comma", () => {
    expect(parsePrice("8,9")).toBe(8.9);
  });

  it("returns 0 for values it cannot read - the reason validateOrder must reject them", () => {
    // An empty price field in Strapi, or one typed with its unit, previously made
    // a product sell for nothing.
    expect(parsePrice("")).toBe(0);
    expect(parsePrice(null)).toBe(0);
    expect(parsePrice("8,9 Kč")).toBe(0);
  });
});

describe("gtag VAT", () => {
  it("treats prices as VAT-inclusive", () => {
    const event = gtag({
      idOrder: 1,
      sum: "1948",
      currency: "Kč",
      deliveryPrice: "ZDARMA",
      basket: [],
    } as any);

    // 1948 / 1.21 = 1609.92 net, 338.08 VAT - not 1948 - (1948 * 0.21).
    expect(event.value).toBeCloseTo(1609.92, 2);
    expect(event.tax).toBeCloseTo(338.08, 2);
    expect(event.value + event.tax).toBeCloseTo(1948, 2);
  });

  it("reports no shipping when delivery was free", () => {
    const event = gtag({
      idOrder: 1,
      sum: "1600",
      currency: "Kč",
      deliveryPrice: "ZDARMA",
      basket: [],
    } as any);

    expect(event.shipping).toBe(0);
  });
});

describe("feed price format", () => {
  it("emits a dot decimal separator, which Google Merchant requires", () => {
    // Strapi stores EN prices with the Czech comma; "4,50 EUR" is rejected.
    expect(feedPrice("4,50", "en")).toBe("4.50 EUR");
    expect(feedPrice("1250", "cz")).toBe("1250.00 CZK");
  });
});

describe("display price formatting", () => {
  it("groups thousands and keeps Czech prices whole", async () => {
    const { formatPrice } = await import("@/helpers/formatPrice");
    // "208050 Kč" with no separator was what the retest flagged.
    expect(formatPrice(208050, "cz").replace(/ /g, " ")).toBe("208 050 Kč");
  });

  it("gives EUR two decimals every time", async () => {
    const { formatPrice } = await import("@/helpers/formatPrice");
    // The site showed "8.90 €", "5.7 €", "from € 14.5" and "€ 20.4".
    expect(formatPrice("5,7", "en")).toBe("€5.70");
    expect(formatPrice("8,9", "en")).toBe("€8.90");
  });

  it("prices a basket row by quantity, not per piece", async () => {
    const { formatLineTotal } = await import("@/helpers/formatPrice");
    expect(formatLineTotal(219, 4, "cz").replace(/ /g, " ")).toBe("876 Kč");
  });
});

describe("per-country shipping from Strapi", () => {
  const setting: any = {
    shipping: [
      {
        country: "cz",
        deliveryOptions: [{ label: "PPL ČR", price: 150 }],
        paymentOptions: [{ label: "Na dobírku", price: 30, payOnline: false }],
      },
      { country: "de", deliveryOptions: [{ label: "DHL DE", price: 390 }] },
      { country: "at", deliveryOptions: [] },
    ],
    deliveryOptions: [{ label: "Fallback", price: 99 }],
  };

  it("offers the options configured for the chosen country", async () => {
    const { resolveDeliveryData } = await import("@/functions/shippingOptions");
    expect(resolveDeliveryData(setting, "cz", "cz").map((o) => o.value)).toEqual(["PPL ČR"]);
    expect(resolveDeliveryData(setting, "cz", "de").map((o) => o.value)).toEqual(["DHL DE"]);
  });

  it("treats a configured country with no options as 'we do not ship there'", async () => {
    const { resolveDeliveryData } = await import("@/functions/shippingOptions");
    // Must not fall through to the flat list and quietly offer Czech delivery.
    expect(resolveDeliveryData(setting, "cz", "at")).toEqual([]);
  });

  it("falls back to the flat list for a country nobody configured", async () => {
    const { resolveDeliveryData } = await import("@/functions/shippingOptions");
    expect(resolveDeliveryData(setting, "cz", "sk").map((o) => o.value)).toEqual(["Fallback"]);
  });

  it("matches the country by label as well as code", async () => {
    const { resolveDeliveryData } = await import("@/functions/shippingOptions");
    expect(resolveDeliveryData(setting, "cz", "Německo").map((o) => o.value)).toEqual(["DHL DE"]);
  });
});

describe("CMS rich-text links", () => {
  it("treats only off-site http(s) links as external", async () => {
    const { isExternalUrl } = await import("@/helpers/externalLink");
    expect(isExternalUrl("https://modernistdrumshop.com")).toBe(true);
    expect(isExternalUrl("http://vicfirth.com")).toBe(true);
    expect(isExternalUrl("https://pellwood.com/produkty")).toBe(false);
    expect(isExternalUrl("/produkty")).toBe(false);
    expect(isExternalUrl("mailto:info@pellwood.com")).toBe(false);
    expect(isExternalUrl("#parametry")).toBe(false);
  });

  it("strips tracking parameters and keeps the real ones", async () => {
    const { cleanUrl } = await import("@/helpers/externalLink");
    expect(cleanUrl("https://example.com/a?fbclid=XYZ")).toBe("https://example.com/a");
    expect(cleanUrl("https://example.com/a?id=7&utm_source=fb")).toBe("https://example.com/a?id=7");
    // Untouched when there is nothing to strip, so the href stays byte-identical
    // to what the editor typed.
    expect(cleanUrl("https://example.com/a?id=7")).toBe("https://example.com/a?id=7");
    expect(cleanUrl("/produkty?size=24")).toBe("/produkty?size=24");
  });

  it("leaves http:// alone - upgrading blind would break hosts without https", async () => {
    const { cleanUrl } = await import("@/helpers/externalLink");
    expect(cleanUrl("http://example.com/a")).toBe("http://example.com/a");
  });
});

describe("catalogue sorting", () => {
  const products: any[] = [
    { title: "Jazz Model", variants: [{ price: "219" }, { price: "199" }] },
    { title: "Černá mikina", price: "890" },
    { title: "3A", price: "1250" },
    { title: "Claves", price: "" },
  ];

  it("ignores anything unexpected in the URL", async () => {
    const { parseCatalogSort } = await import("@/helpers/sortProducts");
    expect(parseCatalogSort("price-asc")).toBe("price-asc");
    expect(parseCatalogSort("; drop table")).toBe("default");
    expect(parseCatalogSort(undefined)).toBe("default");
  });

  it("prices a product by its cheapest variant, like the card does", async () => {
    const { productPrice } = await import("@/helpers/sortProducts");
    expect(productPrice(products[0])).toBe(199);
    expect(productPrice(products[1])).toBe(890);
  });

  it("orders by real numbers, not the string Postgres would compare", async () => {
    const { sortProducts } = await import("@/helpers/sortProducts");
    // Lexicographically "1250" < "199" < "890", which is the order a database
    // sort on this string column would give.
    expect(sortProducts(products, "price-asc", "cz").map((p) => p.title))
      .toEqual(["Jazz Model", "Černá mikina", "3A", "Claves"]);
  });

  it("puts products with an unreadable price last in both directions", async () => {
    const { sortProducts } = await import("@/helpers/sortProducts");
    expect(sortProducts(products, "price-asc", "cz").at(-1).title).toBe("Claves");
    expect(sortProducts(products, "price-desc", "cz").at(-1).title).toBe("Claves");
  });

  it("sorts Czech titles with Czech collation", async () => {
    const { sortProducts } = await import("@/helpers/sortProducts");
    // A plain database sort puts C-with-caron after Z.
    expect(sortProducts(products, "title-asc", "cz").map((p) => p.title))
      .toEqual(["3A", "Claves", "Černá mikina", "Jazz Model"]);
  });

  it("leaves the default order exactly as Strapi returned it", async () => {
    const { sortProducts } = await import("@/helpers/sortProducts");
    expect(sortProducts(products, "default", "cz")).toBe(products);
  });
});

describe("delivery option prices", () => {
  it("formats a CMS price with Intl, not by hand", async () => {
    const { resolveDeliveryData } = await import("@/functions/shippingOptions");
    const setting: any = { deliveryOptions: [{ label: "DHL", price: 10 }] };
    // The checkout line read "10 €" while the same amount read "€10.00" in the
    // basket - this function was the last hand-rolled price string.
    expect(resolveDeliveryData(setting, "en")[0].price).toBe("€10.00");
    expect(resolveDeliveryData({ deliveryOptions: [{ label: "PPL", price: 150 }] } as any, "cz")[0].price.replace(/\s/g, " ")).toBe("150 Kc".replace("Kc", "K\u010d"));
  });

  it("still says ZDARMA / FREE for zero", async () => {
    const { resolveDeliveryData } = await import("@/functions/shippingOptions");
    expect(resolveDeliveryData({ deliveryOptions: [{ label: "X", price: 0 }] } as any, "cz")[0].price).toBe("ZDARMA");
    expect(resolveDeliveryData({ deliveryOptions: [{ label: "X", price: 0 }] } as any, "en")[0].price).toBe("FREE");
  });

  it("reads its own formatted output back as a number", async () => {
    const { optionPriceToNumber } = await import("@/functions/shippingOptions");
    // computePricing parses these strings back, so the two must agree.
    expect(optionPriceToNumber("€10.00")).toBe(10);
    expect(optionPriceToNumber("150 Kč")).toBe(150);
    expect(optionPriceToNumber("1\u00a0500 K\u010d")).toBe(1500);
    expect(optionPriceToNumber("€1,500.00")).toBe(1500);
    expect(optionPriceToNumber("ZDARMA")).toBe(0);
  });
});
