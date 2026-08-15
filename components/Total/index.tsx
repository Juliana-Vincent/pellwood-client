import React from "react";
import Link from "next/link";
import { useTranslation } from "@/hooks/useTranslation";
import { BasketItem } from "@/types/shop";
import { DELIVERY_FREE_THRESHOLD } from "@/functions/pricingRules";

interface TotalProps {
  sum: number | string;
  sale?: number | string;
  sumBefore?: number | string;
  basket?: BasketItem[];
  delivery?: string | number;
  payment?: string | number;
  isEnd?: boolean;
  /** CMS-configured free-delivery threshold, resolved by the caller - defaults to
   *  the hardcoded pricingRules.ts value if not passed. */
  deliveryFreeThreshold?: number;
}

const Total = ({
  sum,
  sale = 0,
  sumBefore,
  basket,
  delivery,
  payment,
  isEnd,
  deliveryFreeThreshold,
}: TotalProps) => {
  const { t, lang, currency } = useTranslation();

  const parsedSumBefore =
    typeof sumBefore === "string" ? parseFloat(sumBefore) || 0 : sumBefore || 0;
  const parsedSum = typeof sum === "string" ? parseFloat(sum) || 0 : sum || 0;
  const freeThreshold =
    deliveryFreeThreshold ?? DELIVERY_FREE_THRESHOLD[lang as "cz" | "en"];

  return (
    <div className={isEnd ? "tm-total-end" : "tm-basket-total"}>
      {isEnd && (
        <>
          <div className="tm-head-total">
            <h2>{t("ordersummary")}</h2>
            <Link href="/basket">{t("editItems")}</Link>
          </div>
          <div className="tm-canvas-basket-item-wrap">
            {(basket || []).map((item, index) => (
              <div key={item.id || index} className="tm-basket-item">
                <div
                  data-src={item.imgUrl}
                  className="tm-basket-img-wrap uk-background-contain"
                  uk-img=""
                ></div>
                <div className="tm-basket-item-info">
                  <h3 className="tm-basket-item-head">{item.nameProduct}</h3>
                  {item.variantName === item.nameProduct ? (
                    ""
                  ) : (
                    <span>{item.variantName}</span>
                  )}
                  <span>
                    {typeof item.variantPrice === "string"
                      ? item.variantPrice
                      : `${item.variantPrice} ${currency}`}
                  </span>
                  <span>
                    {item.countVariant} {t("pc")}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      <div className={isEnd ? "tm-basket-total basket-total-end" : ""}>
        <table className="uk-table uk-table-divider">
          {!isEnd && (
            <thead>
              <tr>
                <th colSpan={2}>{t("ordersummary")}</th>
              </tr>
            </thead>
          )}
          <tbody>
            <tr>
              <td>{t("delivery")}</td>
              <td>
                {isEnd ? (
                  <span
                    className={
                      delivery === t("free") ||
                      (delivery &&
                        String(delivery).length > 0 &&
                        parsedSumBefore > freeThreshold)
                        ? "tm-positive"
                        : ""
                    }
                  >
                    {delivery &&
                      String(delivery).length > 0 &&
                      parsedSumBefore <= freeThreshold &&
                      delivery}
                    {delivery &&
                      String(delivery).length > 0 &&
                      parsedSumBefore > freeThreshold &&
                      t("free")}
                    {(!delivery || String(delivery).length === 0) &&
                      t("notSelected")}
                  </span>
                ) : (
                  <span
                    className={`${parsedSum > freeThreshold ? "tm-positive" : ""}`}
                  >
                    {lang === "cz" && parsedSum <= freeThreshold && "od 150 Kč"}
                    {lang === "en" && parsedSum <= freeThreshold && "10 €"}
                    {parsedSum > freeThreshold && t("free")}
                  </span>
                )}
              </td>
            </tr>
            {isEnd && (
              <tr>
                <td>{t("payment")}</td>
                <td>
                  <span className={payment === t("free") ? "tm-positive" : ""}>
                    {payment && String(payment).length > 0
                      ? payment
                      : t("notSelected")}
                  </span>
                </td>
              </tr>
            )}
            {Number(sale) > 0 && (
              <tr>
                <td>{t("sale")}</td>
                <td>
                  -{sale} {currency}
                </td>
              </tr>
            )}
            <tr>
              <td>{t("totalprice")}</td>
              <td>
                {sum} {currency}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Total;
