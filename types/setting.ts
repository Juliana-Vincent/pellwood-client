import type { BlocksContent } from '@strapi/blocks-react-renderer';

export interface Setting {
  title?: string;
  description: string;
  footer?: Footer[];
  /** CMS-editable shipping/payment/discount config - see functions/shippingOptions.ts
   *  and functions/pricingRules.ts for the hardcoded fallback used when these are
   *  unset (not yet added in Strapi, or empty for this locale). */
  deliveryOptions?: CmsShippingOption[];
  paymentOptions?: CmsShippingOption[];
  /** Per-country shipping, managed in Strapi as Setting -> Shipping. Each entry is
   *  one country with its own delivery and payment options, so an editor adds a
   *  country and fills in what is offered there. Takes precedence over the flat
   *  deliveryOptions/paymentOptions lists above, which remain for the countries
   *  nobody has configured yet. */
  shipping?: CountryShipping[];
  discountThreshold?: number;
  deliveryFreeThreshold?: number;
  discountRatePercent?: number;
  /** CZK per 1 EUR, shared by both locales. Prices products that exist in one locale only. */
  eurCzkRate?: number | string | null;
  [key: string]: any;
}

export interface Footer {
  title?: string;
  content: BlocksContent;
}

/** Maps 1:1 to the Strapi shipping-option component. label/price are typed nullable
 *  because Strapi doesn't require fields on a component row - a CMS editor can add a
 *  row and leave it half-filled, which comes back over the API as null, not absent.
 *  See functions/shippingOptions.ts's fromCms for where those rows get filtered out. */
export interface CmsShippingOption {
  label: string | null;
  price: number | null;
  payOnline?: boolean | null;
  countries?: string | null;
}
export interface CountryShipping {
  country?: string | null;
  deliveryOptions?: CmsShippingOption[];
  paymentOptions?: CmsShippingOption[];
}
