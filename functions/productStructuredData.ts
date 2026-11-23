import type { Setting } from "@/types/setting";
import { countryCode } from "@/helpers/countryCode";

/*
 * Offer data for the product page's schema.org markup.
 *
 * Google's merchant listings need an `Offer` (an AggregateOffer only qualifies for
 * the plainer product snippets), and Search Console asks every offer for its
 * shipping cost and return policy. Everything here comes from what the shop
 * actually does: shipping prices from Strapi -> Nastavení e-shopu -> Shipping, the
 * return policy from the terms and conditions (VOP, section V). No delivery time
 * is stated because the shop doesn't promise one.
 */

/** Terms, section V: 14 days from receipt, returned by post, the customer pays
 *  for sending it back. */
const RETURN_DAYS = 14;

/** Made to the customer's order, so excluded from withdrawal (§ 1837 of the
 *  civil code, VOP V.3). Matched by the Czech slug, which both locales know. */
const NON_RETURNABLE_CS_SLUGS = new Set(["palicky-s-vlastnim-potiskem"]);

type Json = Record<string, unknown>;

/** Countries the shop ships to, as ISO codes ("CZ"), from the Shipping settings. */
export function shippingCountries(setting: Partial<Setting> | undefined): string[] {
  return (setting?.shipping || [])
    .filter((entry) => entry.country && (entry.deliveryOptions || []).some((o) => o.label))
    .map((entry) => countryCode(entry.country || "").toUpperCase())
    .filter((code) => /^[A-Z]{2}$/.test(code));
}

/** The cheapest delivery option per country, in this locale's currency. */
export function shippingDetails(
  setting: Partial<Setting> | undefined,
  priceCurrency: string,
): Json[] {
  return (setting?.shipping || []).flatMap((entry) => {
    const code = countryCode(entry.country || "").toUpperCase();
    const prices = (entry.deliveryOptions || [])
      .filter((o) => o.label && typeof o.price === "number" && o.price >= 0)
      .map((o) => o.price as number);
    if (!/^[A-Z]{2}$/.test(code) || !prices.length) return [];
    return [
      {
        "@type": "OfferShippingDetails",
        shippingDestination: { "@type": "DefinedRegion", addressCountry: code },
        shippingRate: {
          "@type": "MonetaryAmount",
          value: Math.min(...prices),
          currency: priceCurrency,
        },
      },
    ];
  });
}

export function returnPolicy(countries: string[], csSlug: string | null): Json | null {
  if (!countries.length) return null;
  if (csSlug && NON_RETURNABLE_CS_SLUGS.has(csSlug)) {
    return {
      "@type": "MerchantReturnPolicy",
      applicableCountry: countries,
      returnPolicyCategory: "https://schema.org/MerchantReturnNotPermitted",
    };
  }
  return {
    "@type": "MerchantReturnPolicy",
    applicableCountry: countries,
    returnPolicyCategory: "https://schema.org/MerchantReturnFiniteReturnWindow",
    merchantReturnDays: RETURN_DAYS,
    returnMethod: "https://schema.org/ReturnByMail",
    returnFees: "https://schema.org/ReturnFeesCustomerResponsibility",
  };
}

export interface OfferInput {
  /** Variant name, or null for a product without variants. */
  name: string | null;
  price: number;
  inStock: boolean;
}

/** One Offer per variant that has a price - Google reads each price, and every
 *  one carries the same shipping and return details. */
export function buildOffers(
  items: OfferInput[],
  {
    url,
    priceCurrency,
    shipping,
    returns,
  }: { url: string; priceCurrency: string; shipping: Json[]; returns: Json | null },
): Json[] {
  return items
    .filter((item) => item.price > 0)
    .map((item) => ({
      "@type": "Offer",
      ...(item.name ? { name: item.name } : {}),
      url,
      price: item.price,
      priceCurrency,
      itemCondition: "https://schema.org/NewCondition",
      availability: `https://schema.org/${item.inStock ? "InStock" : "OutOfStock"}`,
      ...(shipping.length ? { shippingDetails: shipping } : {}),
      ...(returns ? { hasMerchantReturnPolicy: returns } : {}),
    }));
}
