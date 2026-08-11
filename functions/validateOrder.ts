import { fetchAPI } from "@/lib/strapi";
import { deliveryData, paymentData, optionPriceToNumber } from "@/functions/shippingOptions";

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

// Recomputes the order total from authoritative Strapi product prices and the
// known delivery/payment option list, instead of trusting whatever the client
// posted. Mirrors the discount/threshold logic in functions/sumTotal.ts.
export async function computeAuthoritativeOrderTotal(
  basket: BasketItemInput[],
  delivery: DeliveryPaymentInput,
  payment: DeliveryPaymentInput,
  currency: string
) {
  const lang: "cz" | "en" = currency === "Kč" ? "cz" : "en";

  let itemsSum = 0;
  for (const item of basket) {
    const productRes = await fetchAPI("products", {
      filters: { documentId: { $eq: item.id } },
      populate: { variants: true },
    });
    const product = productRes.data?.[0];
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

  const deliveryOption = deliveryData[lang].find((d) => d.value === delivery?.value);
  const paymentOption = paymentData[lang].find((p) => p.value === payment?.value);
  if (!deliveryOption) throw new Error("Unknown delivery method");
  if (!paymentOption) throw new Error("Unknown payment method");

  let sumAll = itemsSum;
  const discountThreshold = lang === "cz" ? 2000 : 150;
  if (sumAll > discountThreshold) {
    sumAll -= sumAll * 0.05;
  }

  const deliveryThreshold = lang === "cz" ? 1500 : 100;
  if (sumAll <= deliveryThreshold) {
    sumAll += optionPriceToNumber(deliveryOption.price);
  }
  sumAll += optionPriceToNumber(paymentOption.price);

  const total = lang === "en" ? Math.round(sumAll * 100) / 100 : Math.round(sumAll);

  return {
    total,
    deliveryPrice: deliveryOption.price,
    paymentPrice: paymentOption.price,
    payOnline: !!paymentOption.payOnline,
  };
}
