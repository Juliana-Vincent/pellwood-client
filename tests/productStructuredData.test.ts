import { describe, it, expect } from "vitest";
import {
  buildOffers,
  returnPolicy,
  shippingCountries,
  shippingDetails,
} from "@/functions/productStructuredData";

// Shape and values of Strapi -> Nastavení e-shopu -> Shipping (cs), Nov 2026.
const csSetting = {
  shipping: [
    {
      country: "cz",
      deliveryOptions: [
        { label: "PPL standardní doručení v ČR", price: 150 },
        { label: "PPL Express", price: 250 },
      ],
    },
    { country: "sk", deliveryOptions: [{ label: "PPL na Slovensko", price: 150 }] },
    { country: "de", deliveryOptions: [{ label: "DHL", price: 390 }] },
    { country: "at", deliveryOptions: [{ label: "Rakousko", price: 390 }] },
    // Half-filled rows and empty countries must not produce markup.
    { country: "pl", deliveryOptions: [{ label: null, price: 100 }] },
  ],
};

describe("product structured data", () => {
  it("states the cheapest delivery per shipped country", () => {
    const details = shippingDetails(csSetting, "CZK");
    expect(details.map((d: any) => d.shippingDestination.addressCountry)).toEqual([
      "CZ",
      "SK",
      "DE",
      "AT",
    ]);
    expect((details[0] as any).shippingRate).toEqual({
      "@type": "MonetaryAmount",
      value: 150,
      currency: "CZK",
    });
  });

  it("uses the 14-day, customer-pays return policy from the VOP", () => {
    const policy = returnPolicy(shippingCountries(csSetting), "5a-medium") as any;
    expect(policy.applicableCountry).toEqual(["CZ", "SK", "DE", "AT"]);
    expect(policy.merchantReturnDays).toBe(14);
    expect(policy.returnFees).toBe("https://schema.org/ReturnFeesCustomerResponsibility");
  });

  it("marks custom-printed sticks as not returnable", () => {
    const policy = returnPolicy(["CZ"], "palicky-s-vlastnim-potiskem") as any;
    expect(policy.returnPolicyCategory).toBe("https://schema.org/MerchantReturnNotPermitted");
    expect(policy.merchantReturnDays).toBeUndefined();
  });

  it("makes one Offer per priced variant, never an AggregateOffer", () => {
    const offers = buildOffers(
      [
        { name: "Hickory", price: 528, inStock: true },
        { name: "Habr", price: 356, inStock: false },
        { name: "Bez ceny", price: 0, inStock: true },
      ],
      { url: "https://pellwood.com/produkt/x", priceCurrency: "CZK", shipping: [], returns: null },
    ) as any[];
    expect(offers).toHaveLength(2);
    expect(offers.every((o) => o["@type"] === "Offer")).toBe(true);
    expect(offers[1].availability).toBe("https://schema.org/OutOfStock");
    expect(offers[0].shippingDetails).toBeUndefined();
  });
});
