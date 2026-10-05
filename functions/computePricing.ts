import { DISCOUNT_THRESHOLD, DELIVERY_FREE_THRESHOLD, DISCOUNT_RATE, PricingRules } from "@/functions/pricingRules";
import { optionPriceToNumber } from "@/functions/shippingOptions";

export interface PricingResult {
  /** Item subtotal after the discount, before delivery/payment. */
  sumBefore: number;
  /** Discount amount subtracted (0 if the discount threshold wasn't met). */
  sale: number;
  /** Final total: discounted items + delivery (unless free) + payment surcharge. */
  total: number;
  /** What delivery actually added to the total - 0 when the free-shipping
   *  threshold waived it. Every consumer that reports "shipping" (the
   *  confirmation email, GA4, the zbozi.cz conversion) needs this rather than the
   *  option's list price, which says 150 Kč even on a free-shipping order. */
  deliveryCharged: number;
}

/**
 * The one implementation of the discount/free-shipping formula. Previously
 * hand-duplicated three times - functions/sumTotal.ts (client display),
 * functions/validateOrder.ts (server-authoritative total), and layout/Canvas.tsx
 * (mini-cart preview) - sharing only the threshold constants, not the actual math.
 * A future change to the formula itself (not just a threshold value) had nothing
 * forcing all three copies to move together; this does.
 *
 * itemsSum is passed in rather than computed here because the two callers get it
 * from different places (trusted client-side basket vs. re-fetched Strapi prices)
 * - that trust boundary is the one thing that must stay separate.
 *
 * rules is optional and defaults to the hardcoded pricingRules.ts constants - pass
 * the result of resolvePricingRules() to use CMS-configured thresholds instead.
 */
export function computePricing(
  itemsSum: number,
  deliveryPrice: string | number,
  paymentPrice: string | number,
  lang: "cz" | "en",
  rules?: PricingRules
): PricingResult {
  const round = (n: number) => (lang === "en" ? Math.round(n * 100) / 100 : Math.round(n));

  let sumAll = itemsSum;

  const discountThreshold = rules?.discountThreshold ?? DISCOUNT_THRESHOLD[lang];
  const discountRate = rules?.discountRate ?? DISCOUNT_RATE;
  let sale = 0;
  if (sumAll > discountThreshold) {
    sale = sumAll * discountRate;
    sumAll -= sale;
  }
  const sumBefore = sumAll;

  const deliveryThreshold = rules?.deliveryFreeThreshold ?? DELIVERY_FREE_THRESHOLD[lang];
  let deliveryCharged = 0;
  if (sumAll <= deliveryThreshold) {
    deliveryCharged = optionPriceToNumber(String(deliveryPrice));
    sumAll += deliveryCharged;
  }
  sumAll += optionPriceToNumber(String(paymentPrice));

  return {
    sumBefore: round(sumBefore),
    sale: round(sale),
    total: round(sumAll),
    deliveryCharged: round(deliveryCharged),
  };
}
