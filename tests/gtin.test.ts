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
