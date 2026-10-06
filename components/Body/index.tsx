import { useContext, useState } from "react";
import { DataStateContext } from "@/context/dataStateContext";
import { useTranslation } from "@/hooks/useTranslation";
import { BasketItem } from "@/types/shop";
import QuantityInput from "@/components/QuantityInput";
import { clampQuantity } from "@/helpers/quantity";
import { formatLineTotal } from "@/helpers/formatPrice";

interface BodyProps {
  setSum: (sum: number | string) => void;
  sum?: number | string;
  basket: BasketItem[];
  setBasket: (basket: BasketItem[]) => void;
}

const BodyWrap = ({ setSum, basket, setBasket }: BodyProps) => {
  const { t, lang, currency } = useTranslation();
  const { dataContextState, dataContextDispatch } = useContext(
    DataStateContext,
  ) as any;
    const [quantityNotice, setQuantityNotice] = useState(false);

  const setCount = (index: number, raw: unknown) => {
    const { value, clamped } = clampQuantity(raw);
    setQuantityNotice(clamped);

    const newBasket = [...basket];
    newBasket[index] = { ...newBasket[index], countVariant: value };

    setBasket(newBasket);
    dataContextDispatch({ state: newBasket, type: "basket" + lang });
    sumBasket(newBasket);
  };

  const sumBasket = (newBasket: BasketItem[]) => {
    const sumAll = newBasket.reduce((acc, item) => {
      if (item.unavailable) return acc;
      const priceStr =
        typeof item.variantPrice === "string"
          ? item.variantPrice.split(" ")[0]
          : item.variantPrice;
      const price = Number(priceStr) || 0;
      return acc + price * Number(item.countVariant);
    }, 0);
    setSum(sumAll);
  };

  const changeCount = (index: number, handle: "up" | "down") => {
    const newBasket = [...basket];
    const item = { ...newBasket[index] };

    let currentCount = Number(item.countVariant) || 1;
    if (handle === "down" && currentCount > 1) {
      currentCount -= 1;
    } else if (handle === "up") {
      currentCount += 1;
    }
    item.countVariant = currentCount;
    newBasket[index] = item;

    setBasket(newBasket);
    dataContextDispatch({ state: newBasket, type: "basket" + lang });
    sumBasket(newBasket);
  };

  const deleteItem = (e: React.MouseEvent, index: number) => {
    e.preventDefault();

    let basketCount = Number(dataContextState["basketCount" + lang]) || 0;
    basketCount = Math.max(0, basketCount - 1);
    dataContextDispatch({ state: basketCount, type: "basketCount" + lang });

    const newBasket = [...basket];
    newBasket.splice(index, 1);

    setBasket(newBasket);
    dataContextDispatch({ state: newBasket, type: "basket" + lang });
    sumBasket(newBasket);
  };

  return (
    <div className="tm-basket-body">
      {quantityNotice && (
        <div className="uk-alert-danger" uk-alert="">
          <p>{t("quantityLimit")}</p>
        </div>
      )}
      <table className="uk-table uk-table-divider uk-table-middle">
        <thead>
          <tr>
            <th>{t("item")}</th>
            <th>{t("quantity")}</th>
            <th>{t("price")}</th>
          </tr>
        </thead>
        <tbody>
          {basket.map((item, index) => (
            <tr
              key={`${item.nameProduct}-${item.variantName}-${index}`}
              className={item.unavailable ? "basket-item-unavailable" : undefined}
            >
              <td>
                <div className="tm-basket-item">
                  <div
                    data-src={item.imgUrl}
                    className="tm-basket-img-wrap uk-background-contain"
                    uk-img=""
                  ></div>
                  <div className="tm-basket-item-info">
                    <h3 className="tm-basket-item-head">{item.nameProduct}</h3>
                    {item.variantName === item.nameProduct ? null : (
                      <span>{item.variantName}</span>
                    )}
                    <div className="tm-remove-item">
                      <button
                        onClick={(e) => deleteItem(e, index)}
                        className="uk-button uk-button-link uk-text-danger"
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "4px",
                          textTransform: "none",
                          padding: 0,
                        }}
                      >
                        <span uk-close=""></span> {t("remove")}
                      </button>
                    </div>
                  </div>
                </div>
              </td>
              <td>
                <QuantityInput
                  value={Number(item.countVariant)}
                  onChange={(value) => setCount(index, value)}
                />
              </td>
              <td>
                <span className="basket-body-price">
                  {/* Price for the row, not per piece - the column is headed
                      "Cena" next to a quantity, so a unit price there reads as
                      the line total and never matches the basket sum. */}
                  {item.unavailable
                    ? t("outOfStock")
                    : formatLineTotal(item.variantPrice, item.countVariant, lang)}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default BodyWrap;
