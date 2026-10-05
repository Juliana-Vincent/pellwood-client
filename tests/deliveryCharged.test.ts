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
