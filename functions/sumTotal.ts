import { computePricing } from "@/functions/computePricing";
import type { PricingRules } from "@/functions/pricingRules";
import { parsePrice } from "@/functions/parsePrice";

export interface BasketItem {
  variantPrice: number | string;
  countVariant: number | string;
  /** Set when the product has no version in the current language. The line is
   *  shown greyed out and counts towards nothing. */
  unavailable?: boolean;
  [key: string]: any;
}

const sumTotal = (
  delivery: string | number | undefined | null,
  payment: string | number | undefined | null,
  basket: BasketItem[],
  setSumBefore: (val: number | string) => void,
  setSale: (val: number | string) => void,
  setSum: (val: number | string) => void,
  lang: 'cz' | 'en',
  rules?: PricingRules
) => {
  const itemsSum = basket.reduce((total, item) => {
    if (item.unavailable) return total;
    const price = parsePrice(item.variantPrice) || 0;
    const count = Number(item.countVariant) || 0;
    return total + (price * count);
  }, 0);

  // Same discount/free-shipping formula the server uses to compute what actually
  // gets charged (functions/validateOrder.ts) - see functions/computePricing.ts.
  const { sumBefore, sale, total } = computePricing(itemsSum, delivery || 0, payment || 0, lang, rules);

  setSale(lang === 'en' ? sale.toFixed(2) : sale);
  setSumBefore(sumBefore);
  setSum(lang === 'en' ? total.toFixed(2) : total);
};

export default sumTotal;
