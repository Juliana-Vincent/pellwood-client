// Canonical delivery/payment option list, shared between the checkout UI
// (components/Checkout/components/shipPay.tsx) and the server-side order total
// validation (src/pages/api/order/index.ts), so the server can check a submitted
// price against the same options the customer was actually shown.
export interface ShippingOption {
  value: string;
  price: string;
  payOnline?: boolean;
}

export const deliveryData: Record<"cz" | "en", ShippingOption[]> = {
  cz: [
    { value: "PPL standartní doručení v ČR", price: "150 Kč" },
    { value: "PPL na Slovensko", price: "200 Kč" },
  ],
  en: [{ value: "DHL", price: "10 €" }],
};

export const paymentData: Record<"cz" | "en", ShippingOption[]> = {
  cz: [
    { value: "Online bankovní platby", price: "ZDARMA", payOnline: true },
    { value: "Platba kartou on-line", price: "ZDARMA", payOnline: true },
    { value: "Na dobírku", price: "30 Kč", payOnline: false },
  ],
  en: [{ value: "Card payment", price: "FREE", payOnline: true }],
};

// "ZDARMA"/"FREE" -> 0, "150 Kč"/"10 €" -> 150 / 10
export function optionPriceToNumber(price: string): number {
  const digits = price.replace(/[^\d.,]/g, "").replace(",", ".");
  const parsed = parseFloat(digits);
  return Number.isFinite(parsed) ? parsed : 0;
}
