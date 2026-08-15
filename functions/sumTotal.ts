import { computePricing } from "@/functions/computePricing";
import type { PricingRules } from "@/functions/pricingRules";

export interface BasketItem {
  variantPrice: number | string;
  countVariant: number | string;
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
    const price = Number(item.variantPrice) || 0;
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
