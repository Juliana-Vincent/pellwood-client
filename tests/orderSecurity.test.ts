import { describe, it, expect, vi } from "vitest";

// ---------------------------------------------------------------------------
// Strapi stand-in for computeAuthoritativeOrderTotal: one product with one
// variant, flat delivery and payment lists.
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
          image: { url: "/uploads/5a.jpg" },
          variants: [{ title: "Hickory", price: "219" }],
        },
      ],
    };
  },
  fetchAllAPI: async () => [],
  urlFor: () => ({ url: () => "https://strapi.example/uploads/5a.jpg" }),
}));

describe("the stored order is built from Strapi, not from the request", () => {
  it("drops posted names, images and any extra field", async () => {
    const { computeAuthoritativeOrderTotal } = await import("@/functions/validateOrder");
    const { basket } = await computeAuthoritativeOrderTotal(
      [
        {
          id: "prod1",
          variantName: "Hickory",
          countVariant: 2,
          // Everything below is attacker-controlled and used to reach the email.
          nameProduct: '<a href="https://evil.example">Click here</a>',
          imgUrl: "https://evil.example/pixel.gif",
          isAdmin: true,
        } as any,
      ],
      { value: "PPL", price: "" },
      { value: "Dobirka", price: "" },
      "Kč",
      "cz",
    );

    expect(basket).toHaveLength(1);
    expect(basket[0]).toEqual({
      id: "prod1",
      nameProduct: "5A Medium",
      variantName: "Hickory",
      variantPrice: 219,
      countVariant: 2,
      imgUrl: "https://strapi.example/uploads/5a.jpg",
    });
  });
});

describe("HTML escaping for the confirmation email", () => {
  it("escapes markup in every nested string and leaves other values alone", async () => {
    const { escapeHtmlDeep } = await import("@/helpers/escapeHtml");
    const out = escapeHtmlDeep({
      note: '<script>alert(1)</script>',
      anotherAdress: { city: `O'Brien "&" Co` },
      basket: [{ nameProduct: "<b>x</b>", countVariant: 2 }],
      payOnline: false,
    });
    expect(out.note).toBe("&lt;script&gt;alert(1)&lt;/script&gt;");
    expect(out.anotherAdress.city).toBe("O&#39;Brien &quot;&amp;&quot; Co");
    expect(out.basket[0]).toEqual({ nameProduct: "&lt;b&gt;x&lt;/b&gt;", countVariant: 2 });
    expect(out.payOnline).toBe(false);
  });
});

describe("email matching", () => {
  it("ignores case and surrounding spaces", async () => {
    const { sameEmail } = await import("@/helpers/email");
    expect(sameEmail("Jana@X.cz", " jana@x.cz ")).toBe(true);
    expect(sameEmail("jana@x.cz", "jan@x.cz")).toBe(false);
    expect(sameEmail("", "")).toBe(false);
  });

  it("escapes LIKE wildcards, because Strapi's $eqi is a LIKE", async () => {
    const { emailFilter } = await import("@/helpers/email");
    // Unescaped, "_" would match any single character and let
    // jan_novak@x.cz see the orders of janXnovak@x.cz.
    expect(emailFilter("Jan_Novak@x.cz")).toEqual({
      "filters[email][$eqi]": "jan\\_novak@x.cz",
    });
    expect(emailFilter("a%b@x.cz")["filters[email][$eqi]"]).toBe("a\\%b@x.cz");
  });
});

describe("address validation accepts real Czech addresses", () => {
  it("allows the street/orientation number slash", async () => {
    const { validationAddress } = await import("@/functions/validationForm");
    expect(validationAddress("Vinohradská 1234/56")).toBe(true);
    expect(validationAddress("Náměstí Míru 5a")).toBe(true);
    expect(validationAddress("<script>")).toBe(false);
  });

  it("allows digits and hyphens in a city", async () => {
    const { validationCity } = await import("@/functions/validationForm");
    expect(validationCity("Praha 4")).toBe(true);
    expect(validationCity("Brno-sever")).toBe(true);
    expect(validationCity("Frankfurt am Main")).toBe(true);
    expect(validationCity("")).toBe(false);
  });
});
