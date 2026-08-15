import type { Setting } from "@/types/setting";

// Single source of truth for the discount/free-delivery thresholds, shared between
// the live cart/checkout display (functions/sumTotal.ts) and the authoritative
// server-side total (functions/validateOrder.ts) - these two used to hardcode the
// same numbers independently, which is exactly how they'd eventually drift.
//
// Also the fallback used when Strapi's Setting thresholds are unset or unreachable -
// see resolvePricingRules below, which is what call sites should actually use.
export const DISCOUNT_THRESHOLD: Record<"cz" | "en", number> = { cz: 2000, en: 150 };
export const DELIVERY_FREE_THRESHOLD: Record<"cz" | "en", number> = { cz: 1500, en: 100 };
export const DISCOUNT_RATE = 0.05;

export interface PricingRules {
  discountThreshold: number;
  deliveryFreeThreshold: number;
  discountRate: number;
}

/** Strapi Setting thresholds for this locale, falling back field-by-field to the
 *  hardcoded defaults above (e.g. only discountThreshold configured so far). */
export function resolvePricingRules(
  setting: Partial<Setting> | undefined,
  lang: "cz" | "en"
): PricingRules {
  return {
    discountThreshold: setting?.discountThreshold ?? DISCOUNT_THRESHOLD[lang],
    deliveryFreeThreshold: setting?.deliveryFreeThreshold ?? DELIVERY_FREE_THRESHOLD[lang],
    discountRate:
      setting?.discountRatePercent != null ? setting.discountRatePercent / 100 : DISCOUNT_RATE,
  };
}
