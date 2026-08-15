import { fetchAPI } from "@/lib/strapi";
import { resolveDeliveryData, resolvePaymentData } from "@/functions/shippingOptions";
import { resolvePricingRules } from "@/functions/pricingRules";
import { computePricing } from "@/functions/computePricing";
import type { Setting } from "@/types/setting";

interface BasketItemInput {
  id: string;
  variantName?: string;
  countVariant: number | string;
}

interface DeliveryPaymentInput {
  value: string;
  price: string;
  payOnline?: boolean;
}

// A real cart has a handful of line items; an unbounded basket array is just a way
// to make this handler fan out one (or, before the fix below, many) Strapi requests
// per submission - cap it well above anything a real customer would hit.
const MAX_BASKET_ITEMS = 100;

// Recomputes the order total from authoritative Strapi product prices and the
// known delivery/payment option list, instead of trusting whatever the client
// posted. The discount/threshold formula itself lives in computePricing.ts, shared
// with the client-side display in functions/sumTotal.ts.
export async function computeAuthoritativeOrderTotal(
  basket: BasketItemInput[],
  delivery: DeliveryPaymentInput,
  payment: DeliveryPaymentInput,
  currency: string
) {
  const lang: "cz" | "en" = currency === "Kč" ? "cz" : "en";
  const strapiLocale = lang === "cz" ? "cs" : "en";

  // CMS-configured shipping/pricing settings, if Strapi has them for this locale -
  // falls back to the hardcoded defaults in shippingOptions.ts/pricingRules.ts below
  // (via resolveDeliveryData/resolvePaymentData/resolvePricingRules) if this fetch
  // fails, so a Strapi outage doesn't take checkout down with it.
  let settingData: Partial<Setting> | undefined;
  try {
    const settingRes = await fetchAPI<Setting>("setting", {
      locale: strapiLocale,
      populate: { deliveryOptions: true, paymentOptions: true },
    });
    settingData = settingRes.data;
  } catch (err) {
    console.error("Failed to fetch Strapi settings, using hardcoded pricing defaults:", err);
  }

  if (!Array.isArray(basket) || !basket.length) {
    throw new Error("Basket is empty");
  }
  if (basket.length > MAX_BASKET_ITEMS) {
    throw new Error("Basket has too many line items");
  }

  // One request for every distinct product in the basket instead of one per line
  // item - a basket referencing the same product multiple times (e.g. two
  // different variants) also collapses to a single fetch.
  const productIds = [...new Set(basket.map((item) => item.id))];
  const productsRes = await fetchAPI("products", {
    filters: { documentId: { $in: productIds } },
    populate: { variants: true },
  });
  const productsById = new Map((productsRes.data || []).map((p: any) => [p.documentId, p]));

  let itemsSum = 0;
  for (const item of basket) {
    const product = productsById.get(item.id) as any;
    if (!product) {
      throw new Error(`Unknown product in basket: ${item.id}`);
    }

    let unitPrice: number;
    if (product.variants?.length) {
      const variant = product.variants.find((v: any) => v.title === item.variantName);
      if (!variant) {
        throw new Error(`Unknown variant "${item.variantName}" for product ${item.id}`);
      }
      unitPrice = Number(variant.price) || 0;
    } else {
      unitPrice = Number(product.price) || 0;
    }

    itemsSum += unitPrice * (Number(item.countVariant) || 0);
  }

  const deliveryOption = resolveDeliveryData(settingData, lang).find((d) => d.value === delivery?.value);
  const paymentOption = resolvePaymentData(settingData, lang).find((p) => p.value === payment?.value);
  if (!deliveryOption) throw new Error("Unknown delivery method");
  if (!paymentOption) throw new Error("Unknown payment method");

  const rules = resolvePricingRules(settingData, lang);
  const { total } = computePricing(itemsSum, deliveryOption.price, paymentOption.price, lang, rules);

  return {
    total,
    deliveryPrice: deliveryOption.price,
    paymentPrice: paymentOption.price,
    payOnline: !!paymentOption.payOnline,
  };
}
