import React from "react";
import { useTranslation } from "@/hooks/useTranslation";
import { deliveryData, paymentData } from "@/functions/shippingOptions";
import {
  DeliveryMethodState,
  PaymentMethodState,
  CheckoutErrors,
} from "@/src/types/shop";

interface ShipPayProps {
  delivery: DeliveryMethodState;
  setDelivery: React.Dispatch<React.SetStateAction<DeliveryMethodState>>;
  payment: PaymentMethodState;
  setPayment: React.Dispatch<React.SetStateAction<PaymentMethodState>>;
  error: CheckoutErrors;
  setError: React.Dispatch<React.SetStateAction<CheckoutErrors>>;
  sumBefore: number | string;
}

const ShipPay = ({
  delivery,
  error,
  setError,
  sumBefore,
  setDelivery,
  payment,
  setPayment,
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

  const sum = typeof sumBefore === "string" ? parseFloat(sumBefore) : sumBefore;
  const isFreeShipping =
    (lang === "cz" && sum > 1500) || (lang === "en" && sum > 100);

  return (
    <div className="tm-payship">
      <div className="form_column">
        <div>
          <legend className="uk-legend">{t("delivery")}</legend>

          {deliveryData[lang as keyof typeof deliveryData].map(
            (item, index) => {
              const isFree =
                item.price === "ZDARMA" ||
                item.price === "FREE" ||
                isFreeShipping;

              return (
                <div key={index} className="uk-grid-small" uk-grid="">
                  <div className="uk-width-expand">
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
          {paymentData[lang as keyof typeof paymentData].map((item, index) => {
            const isFree = item.price === "ZDARMA" || item.price === "FREE";

            return (
              <div key={index} className="uk-grid-small" uk-grid="">
                <div className="uk-width-expand">
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
