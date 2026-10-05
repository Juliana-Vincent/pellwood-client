import { fetchAPI } from "@/lib/strapi";
import { resolveDeliveryData, resolvePaymentData } from "@/functions/shippingOptions";
import { resolvePricingRules } from "@/functions/pricingRules";
import { computePricing } from "@/functions/computePricing";
import type { Setting } from "@/types/setting";
import { parsePrice } from "@/functions/parsePrice";
import { servesCountry } from "@/helpers/countryCode";
import order from "@/pages/api/order";

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

// Everything this module rejects is a bad request, not a server fault. Throwing a
// plain Error meant /api/order answered 500, which reads as "the site crashed" to
// the customer and to anyone reading the logs - the order was in fact correctly
// refused.
export class OrderValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "OrderValidationError";
  }
}

// Recomputes the order total from authoritative Strapi product prices and the
// known delivery/payment option list, instead of trusting whatever the client
// posted. The discount/threshold formula itself lives in computePricing.ts, shared
// with the client-side display in functions/sumTotal.ts.
export async function computeAuthoritativeOrderTotal(
  basket: BasketItemInput[],
  delivery: DeliveryPaymentInput,
  payment: DeliveryPaymentInput,
  currency: string,
  country?: string,

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
    throw new OrderValidationError("Basket is empty");
  }
  if (basket.length > MAX_BASKET_ITEMS) {
    throw new OrderValidationError("Basket has too many line items");
  }

  // One request for every distinct product in the basket instead of one per line
  // item - a basket referencing the same product multiple times (e.g. two
  // different variants) also collapses to a single fetch.
  const productIds = [...new Set(basket.map((item) => item.id))];
  // Without an explicit page size Strapi applies its default of 25, so a basket
  // with more than 25 distinct products silently lost the rest and then threw
  // "Unknown product in basket" as a generic 500. MAX_BASKET_ITEMS is 100.
  const productsRes = await fetchAPI("products", {
    locale: strapiLocale,
    filters: { documentId: { $in: productIds } },
    populate: { variants: true },
    pagination: { pageSize: MAX_BASKET_ITEMS },
  });
  const productsById = new Map((productsRes.data || []).map((p: any) => [p.documentId, p]));

  let itemsSum = 0;
  const verifiedBasket: any[] = [];

  for (const item of basket) {
    const product = productsById.get(item.id) as any;
    if (!product) {
      throw new OrderValidationError(`Unknown product in basket: ${item.id}`);
    }
    
    const quantity = Number(item.countVariant);
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > 1000) {
      throw new OrderValidationError(`Invalid quantity for product ${item.id}: ${item.countVariant}`);
    }

    let unitPrice: number;
    if (product.variants?.length) {
      const variant = product.variants.find((v: any) => v.title === item.variantName);
      if (!variant) {
        throw new OrderValidationError(`Unknown variant "${item.variantName}" for product ${item.id}`);
      }
      unitPrice = parsePrice(variant.price);
    } else {
      unitPrice = parsePrice(product.price);
    }

    // parsePrice returns 0 for anything it can't read - an empty price field in
    // Strapi, or a value typed with its unit ("8,9 Kč"). Without this, such a
    // product is sold for nothing: the basket subtotal is 0 and the customer is
    // charged the shipping fee alone.
    if (!(unitPrice > 0)) {
      throw new OrderValidationError(
        `Product ${item.id}${item.variantName ? ` / "${item.variantName}"` : ""} has no usable price`
      );
    }

    itemsSum += unitPrice * quantity;

    verifiedBasket.push({ ...item, variantPrice: unitPrice, countVariant: quantity });
  }

  const deliveryOption = resolveDeliveryData(settingData, lang).find((d) => d.value === delivery?.value);
  const paymentOption = resolvePaymentData(settingData, lang).find((p) => p.value === payment?.value);
  if (!deliveryOption) throw new OrderValidationError("Unknown delivery method");

  if (!servesCountry(deliveryOption, country)) {
    throw new OrderValidationError(
      `Delivery "${deliveryOption.value}" is not available for country ${country}`,
    );
  }
  
  if (!paymentOption) throw new OrderValidationError("Unknown payment method");

  const rules = resolvePricingRules(settingData, lang);
  const { total, deliveryCharged } = computePricing(
    itemsSum, deliveryOption.price, paymentOption.price, lang, rules,
  );

  // Store what the customer was actually charged for delivery, not the option's
  // list price. Everything downstream reads this field as "shipping": the
  // confirmation email, the GA4 purchase event and the zbozi.cz conversion all
  // reported 150 Kč of shipping on orders that shipped free.
  const freeLabel = lang === "cz" ? "ZDARMA" : "FREE";

  return {
    total,
    deliveryPrice: deliveryCharged > 0 ? deliveryOption.price : freeLabel,
    paymentPrice: paymentOption.price,
    payOnline: !!paymentOption.payOnline,
    basket: verifiedBasket,
  };
}