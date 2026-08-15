import { useContext } from "react";
import { DataStateContext } from "@/context/dataStateContext";
import { useTranslation } from "@/hooks/useTranslation";
import { BasketItem } from "@/types/shop";

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

  const sumBasket = (newBasket: BasketItem[]) => {
    const sumAll = newBasket.reduce((acc, item) => {
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

  const handleChange = (index: number, value: string) => {
    const newBasket = [...basket];
    const item = { ...newBasket[index] };
    item.countVariant = Number(value) || 1;
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
            <tr key={`${item.nameProduct}-${item.variantName}-${index}`}>
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
                <div className="custom_number quantity">
                  <input
                    type="number"
                    min="1"
                    max="1000"
                    step="1"
                    value={item.countVariant}
                    onChange={(e) => handleChange(index, e.target.value)}
                  />
                  <div className="quantity-nav">
                    <div
                      className="quantity-button quantity-up"
                      onClick={() => changeCount(index, "up")}
                    >
                      +
                    </div>
                    <div
                      className="quantity-button quantity-down"
                      onClick={() => changeCount(index, "down")}
                    >
                      -
                    </div>
                  </div>
                </div>
              </td>
              <td>
                <span className="basket-body-price">
                  {typeof item.variantPrice === "string" &&
                  isNaN(Number(item.variantPrice.split(" ")[0]))
                    ? item.variantPrice
                    : `${item.variantPrice} ${currency}`}
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
