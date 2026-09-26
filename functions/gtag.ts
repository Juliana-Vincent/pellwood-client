import type { OrderData } from "../types/shop";

// GA4's recommended `purchase` event item schema - https://developers.google.com/analytics/devguides/collection/ga4/reference/events#purchase
// (UA's Enhanced Ecommerce used id/name/brand/variant/list_position; GA4 renamed
// all of these, it's not just a cosmetic difference).
export interface GtagItem {
  item_id: string;
  item_name: string;
  item_brand: string;
  item_variant: string;
  index: number;
  quantity: number;
  price: number;
}

export interface GtagPurchaseEvent {
  transaction_id: string;
  affiliation: string;
  value: number;
  currency: string;
  tax: number;
  shipping: number;
  items: GtagItem[];
}

const buildGtagPayload = (data: OrderData): GtagPurchaseEvent => {
  const sum = Number(data.sum) || 0;
  const tax = sum * 0.21;
  const sumWithoutTax = sum - tax;

  // Gracefully handles numbers and strings like "100 Kč", "ZDARMA", "FREE"
  const shipping = parseInt(String(data.deliveryPrice)) || 0;

  return {
    transaction_id: String(data.idOrder),
    affiliation: "Pellwood",
    value: Number(sumWithoutTax.toFixed(2)),
    currency: data.currency === "Kč" ? "CZK" : "EUR",
    tax: Number(tax.toFixed(2)),
    shipping,
    items: data.basket.map((item, index) => ({
      item_id: item.id || "",
      item_name: item.nameProduct || "",
      item_brand: "Pellwood",
      item_variant: item.variantName || "",
      index,
      quantity: Number(item.countVariant) || 1,
      price: Number(item.variantPrice) || 0,
    })),
  };
};

export default buildGtagPayload;
