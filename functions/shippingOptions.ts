import type { CmsShippingOption, Setting } from "@/types/setting";

export interface ShippingOption {
  value: string;
  price: string;
  payOnline?: boolean;
  countries?: string[]; // undefined = available everywhere
}

export const deliveryData: Record<"cz" | "en", ShippingOption[]> = {
  cz: [
    { value: "PPL standartní doručení v ČR", price: "150 Kč", countries: ["cz"] },
    { value: "PPL na Slovensko", price: "200 Kč", countries: ["sk"] },
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

const formatPrice = (price: number, lang: "cz" | "en"): string => {
  if (price <= 0) return lang === "cz" ? "ZDARMA" : "FREE";
  return lang === "cz" ? `${price} Kč` : `${price} €`;
};

// Strapi doesn't require every field on a repeatable component row - a CMS editor
// can add a delivery/payment option and leave it half-filled (label/price still
// null). Drop those rows entirely rather than letting null flow into app state:
// a null `value` there ends up as the selected delivery/payment method, and every
// consumer (this file's own onChange handlers, validateOrder.ts, ShipPay) assumes
// value is always a real string.
const fromCms = (options: CmsShippingOption[], lang: "cz" | "en"): ShippingOption[] =>
  options
    .filter((item): item is CmsShippingOption & { label: string } => !!item.label)
    .map((item) => ({
      value: item.label,
      price: formatPrice(item.price ?? 0, lang),
      payOnline: !!item.payOnline,
      countries: item.countries
      ? String(item.countries).split(",").map((c) => c.trim().toLowerCase()).filter(Boolean)
      : undefined,
    }));


export function resolveDeliveryData(
  setting: Partial<Setting> | undefined,
  lang: "cz" | "en"
): ShippingOption[] {
  const cms = setting?.deliveryOptions?.length ? fromCms(setting.deliveryOptions, lang) : [];
  return cms.length ? cms : deliveryData[lang];
}

/** Strapi Setting.paymentOptions for this locale, or the hardcoded default if unset
 *  or every configured row is incomplete. */
export function resolvePaymentData(
  setting: Partial<Setting> | undefined,
  lang: "cz" | "en"
): ShippingOption[] {
  const cms = setting?.paymentOptions?.length ? fromCms(setting.paymentOptions, lang) : [];
  return cms.length ? cms : paymentData[lang];
}
