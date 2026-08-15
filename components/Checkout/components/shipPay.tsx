import React from "react";
import { useTranslation } from "@/hooks/useTranslation";
import { deliveryData, paymentData, ShippingOption } from "@/functions/shippingOptions";
import { DELIVERY_FREE_THRESHOLD } from "@/functions/pricingRules";
import {
  DeliveryMethodState,
  PaymentMethodState,
  CheckoutErrors,
} from "@/types/shop";

interface ShipPayProps {
  delivery: DeliveryMethodState;
  setDelivery: React.Dispatch<React.SetStateAction<DeliveryMethodState>>;
  payment: PaymentMethodState;
  setPayment: React.Dispatch<React.SetStateAction<PaymentMethodState>>;
  error: CheckoutErrors;
  setError: React.Dispatch<React.SetStateAction<CheckoutErrors>>;
  sumBefore: number | string;
  /** CMS-configured option lists/threshold, resolved by the caller - default to the
   *  hardcoded shippingOptions.ts/pricingRules.ts values if not passed. */
  deliveryOptions?: ShippingOption[];
  paymentOptions?: ShippingOption[];
  deliveryFreeThreshold?: number;
}

const ShipPay = ({
  delivery,
  error,
  setError,
  sumBefore,
  setDelivery,
  payment,
  setPayment,
  deliveryOptions,
  paymentOptions,
  deliveryFreeThreshold,
}: ShipPayProps) => {
  const { t, lang } = useTranslation();

  const onChange = (type: "delivery" | "payment", item: any) => {
    if (type === "delivery") {
      setDelivery({
        value: item.value,
        price: item.price,
        payOnline: item.payOnline || false,
      });
      setError((prev) => ({ ...prev, delivery: false }));
    } else if (type === "payment") {
      setPayment({
        value: item.value,
        price: item.price,
        payOnline: item.payOnline || false,
      });
      setError((prev) => ({ ...prev, payment: false }));
    }
  };

  const resolvedDelivery = deliveryOptions ?? deliveryData[lang as keyof typeof deliveryData];
  const resolvedPayment = paymentOptions ?? paymentData[lang as keyof typeof paymentData];
  const freeThreshold = deliveryFreeThreshold ?? DELIVERY_FREE_THRESHOLD[lang as "cz" | "en"];

  const sum = typeof sumBefore === "string" ? parseFloat(sumBefore) : sumBefore;
  const isFreeShipping = sum > freeThreshold;

  return (
    <div className="tm-payship">
      <div className="form_column">
        <div>
          <legend className="uk-legend">{t("delivery")}</legend>

          {resolvedDelivery.map(
            (item, index) => {
              const isFree =
                item.price === "ZDARMA" ||
                item.price === "FREE" ||
                isFreeShipping;

              return (
                // UIkit's uk-grid auto-init adds its own "uk-grid" class here and
                // "uk-first-column" to the first child, in the window between initial
                // paint and React's hydration walk - same UIkit-vs-hydration conflict
                // fixed elsewhere in the codebase (e.g. pages/produkty/index.tsx's grid).
                <div key={index} className="uk-grid-small" uk-grid="" suppressHydrationWarning>
                  <div className="uk-width-expand" suppressHydrationWarning>
                    <div className="radio_item">
                      <input
                        type="radio"
                        id={`delivery_${index}`}
                        onChange={() => onChange("delivery", item)}
                        checked={delivery.value === item.value}
                      />
                      <label htmlFor={`delivery_${index}`}></label>
                      <label htmlFor={`delivery_${index}`}>{item.value}</label>
                    </div>
                  </div>
                  <div className={`method-price ${isFree && "tm-positive"}`}>
                    {isFree ? (lang === "cz" ? "ZDARMA" : "FREE") : item.price}
                  </div>
                </div>
              );
            },
          )}
          {error.delivery && (
            <div className="uk-alert-danger" uk-alert="">
              <p>{t("selectDeliveryError")}</p>
            </div>
          )}
        </div>

        <div>
          <legend className="uk-legend">{t("payment")}</legend>
          {resolvedPayment.map((item, index) => {
            const isFree = item.price === "ZDARMA" || item.price === "FREE";

            return (
              <div key={index} className="uk-grid-small" uk-grid="" suppressHydrationWarning>
                <div className="uk-width-expand" suppressHydrationWarning>
                  <div className="radio_item">
                    <input
                      type="radio"
                      id={`pay_${index}`}
                      onChange={() => onChange("payment", item)}
                      checked={payment.value === item.value}
                    />
                    <label htmlFor={`pay_${index}`}></label>
                    <label htmlFor={`pay_${index}`}>{item.value}</label>
                  </div>
                </div>
                <div className={`method-price ${isFree && "tm-positive"}`}>
                  {item.price}
                </div>
              </div>
            );
          })}

          {error.payment && (
            <div className="uk-alert-danger" uk-alert="">
              <p>{t("selectPayMehodError")}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ShipPay;
