import { describe, it, expect } from "vitest";
import { validGtin, gtinProperty } from "@/helpers/gtin";
import { buildOffers } from "@/functions/productStructuredData";
import { feedModel } from "@/functions/feedModel";
import toXmlHeureka from "@/functions/toXmlHeurekaFeed";
import toXmlProduct from "@/functions/toXmlProductFeed";

describe("EAN / GTIN", () => {
  it("accepts the client's codes, confirmed on a real package", () => {
    expect(validGtin("8594233420008")).toBe("8594233420008"); // 2B HO
    expect(validGtin("08594233422460")).toBe("8594233422460"); // 5A Mirror, written with a leading 0
    expect(validGtin(" 859 4233 422477 ")).toBe("8594233422477");
  });

  it("drops a typo, the bare 12-digit code and junk", () => {
    expect(validGtin("8594233420009")).toBeNull();
    expect(validGtin("859423342000")).toBeNull();
    expect(validGtin("")).toBeNull();
    expect(validGtin(null)).toBeNull();
    expect(validGtin("EAN 123")).toBeNull();
  });

  it("names the schema.org property by length", () => {
    expect(gtinProperty("8594233420008")).toBe("gtin13");
  });

  it("puts each variant's code on its Offer", () => {
    const offers = buildOffers(
      [
        { name: "Premium Habr", price: 356, inStock: true, gtin: "8594233420008" },
        { name: "Premium Hickory", price: 356, inStock: true, gtin: null },
      ],
      { url: "https://pellwood.com/produkt/2b", priceCurrency: "CZK", shipping: [], returns: null },
    ) as any[];
    expect(offers[0].gtin13).toBe("8594233420008");
    expect(offers[1].gtin13).toBeUndefined();
  });

  it("writes the code into the Google and Heureka feeds", () => {
    const items = feedModel("cz", [
      {
        documentId: "abcdefghijklmnop",
        title: "2B",
        slug: "2b",
        image: { url: "/x.jpg" },
        variants: [
          { title: "Premium Habr", price: "356", ean: "8594233420008" },
          { title: "Premium Hickory", price: "356", ean: "123" },
        ],
      },
    ]);
    expect(items[0].gtin).toBe("8594233420008");
    expect(items[1].gtin).toBeUndefined();
    expect(toXmlHeureka(items)).toContain("<EAN>8594233420008</EAN>");
    expect(toXmlProduct(items)).toContain("<g:gtin>8594233420008</g:gtin>");
    expect(toXmlHeureka(items).match(/<EAN>/g)).toHaveLength(1);
  });
});

import { ean13Modules, barRuns } from "@/helpers/ean13";
import { shownEan } from "@/helpers/gtin";

describe("EAN barcode", () => {
  // Reference patterns from the python-barcode library.
  const reference: Record<string, string> = {
    "8594233420008": "10101100010010111010001100110110100001011110101010101110011011001110010111001011100101001000101",
    "8594233422477": "10101100010010111010001100110110100001011110101010101110011011001101100101110010001001000100101",
    "4006381333931": "10100011010100111010111101111010001001011001101010100001010000101000010111010010000101100110101",
    "0012345678905": "10100011010011001001001101111010100011011000101010101000010001001001000111010011100101001110101",
  };

  it("draws the same bars as a reference encoder", () => {
    for (const [code, modules] of Object.entries(reference)) {
      expect(ean13Modules(code)).toBe(modules);
    }
  });

  it("merges neighbouring black modules into one bar", () => {
    expect(barRuns("1011100")).toEqual([
      [0, 1],
      [2, 3],
    ]);
  });

  const product = {
    ean: null,
    variants: [
      { title: "Bez ceny", price: 0, ean: "8594233422477" },
      { title: "Premium Habr", price: 356, ean: "8594233420008" },
      { title: "Premium Hickory", price: 528, ean: null },
    ],
  };

  it("shows the chosen variant's code, or the first one with a code", () => {
    expect(shownEan(product, null)).toEqual({ code: "8594233420008", variant: "Premium Habr" });
    expect(shownEan(product, "Premium Habr")?.code).toBe("8594233420008");
    // A chosen variant without a code shows nothing rather than another one's.
    expect(shownEan(product, "Premium Hickory")).toBeNull();
  });

  it("uses the product's own code when it has no variants", () => {
    expect(shownEan({ ean: "8594233422460", variants: [] }, null)).toEqual({
      code: "8594233422460",
      variant: null,
    });
    expect(shownEan({ ean: "123", variants: [] }, null)).toBeNull();
  });
});
