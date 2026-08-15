import React, { useState, useEffect, useContext } from 'react';
import Link from 'next/link';
import UIkit from 'uikit';
import { DataStateContext } from '../context/dataStateContext';
import { useTranslation } from '../hooks/useTranslation';
import { useRouter } from 'next/router';
import { DISCOUNT_THRESHOLD, DELIVERY_FREE_THRESHOLD } from '../functions/pricingRules';
import { computePricing } from '../functions/computePricing';

const Canvas = () => {
  const router = useRouter();
  const { t, lang, currency } = useTranslation();

  const [mounted, setMounted] = useState(false);
  const { dataContextState, dataContextDispatch } = useContext(DataStateContext);

  const basketKey = `basket${lang}` as keyof typeof dataContextState;
  const countKey = `basketCount${lang}` as keyof typeof dataContextState;

  // Derived directly from context on every render (like Header.tsx) instead of a
  // separate local mirror - a local copy previously fell out of sync with context
  // and clobbered the real basketCount back to its stale value after every add-to-cart.
  const basket = (dataContextState[basketKey] as any[]) || [];
  const basketCount = (dataContextState[countKey] as number) || 0;
  const [sum, setSum] = useState<number>(0);
  const [sale, setSale] = useState<number>(0);

  useEffect(() => {
    setMounted(true);
  }, []);

  const closeCanvas = (e: React.MouseEvent, link: string) => {
    if (e) e.preventDefault();
    UIkit.offcanvas('#offcanvas-flip').hide();
    if (link.length) {
      router.push(link);
    }
  };

  const onSumItems = (currentBasket: any[]) => {
    let itemsSum = 0;

    if (currentBasket && currentBasket.length > 0) {
      currentBasket.forEach((item) => {
        let price = item.variantPrice;
        if (typeof price === 'string') {
          price = parseFloat(price.split(' ')[0]);
        }
        itemsSum += price * item.countVariant;
      });
    }

    // Delivery/payment aren't chosen yet at this point in the flow (this is the
    // "just added to cart" preview, before checkout) - same formula as checkout and
    // the server via computePricing.ts, just with no shipping/payment surcharge yet.
    const { sale, total } = computePricing(itemsSum, 0, 0, lang as 'cz' | 'en');
    setSale(sale);
    setSum(total);
  };

  useEffect(() => {
    onSumItems(basket);
  }, [basket, lang]);

  const deleteItem = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    const id = e.currentTarget.dataset.id;
    const name = e.currentTarget.dataset.name;

    const newBasket = [...basket];
    const index = newBasket.findIndex(item => item.id === id && item.variantName === name);

    if (index >= 0) {
      newBasket.splice(index, 1);
      dataContextDispatch({ state: newBasket, type: basketKey as any });
      dataContextDispatch({ state: Math.max(0, basketCount - 1), type: countKey as any });
    }
  };

  if (!mounted) {
    return null;
  }

  // Delivery/discount thresholds - shared with functions/sumTotal.ts and the
  // server-side total in functions/validateOrder.ts via pricingRules.ts, so this
  // mini-cart preview can no longer drift from what checkout/the server charge.
  const deliveryThreshold = DELIVERY_FREE_THRESHOLD[lang as 'cz' | 'en'];
  const discountThreshold = DISCOUNT_THRESHOLD[lang as 'cz' | 'en'];

  const isFreeDelivery = sum > deliveryThreshold;
  const deliveryLabel = isFreeDelivery
    ? t('free')
    : (lang === 'cz' ? 'od 150 Kč' : '10 €');

  const showDeliveryFreeCanvas = sum <= deliveryThreshold;
  const showSaleCanvas = sum <= discountThreshold;

  return (
    <div id="offcanvas-flip" className="uk-offcanvas" uk-offcanvas="flip: true; overlay: true;">
      <div className="uk-offcanvas-bar">
        <div className="tm-canvas-head">
          <span className="tm-circle-count">{basketCount ? basketCount : 0}</span>
          <h2>{t('basket')}</h2>
          <span className="tm-canvas-close" onClick={e => closeCanvas(e, '')}>
            <img src="/assets/times.svg" alt="close" />
          </span>
        </div>
        
        {basketCount > 0 && sum > 0 ? (
          <div>
            {basket.length > 0 && basket.map((item, index) => (
              <div key={item.id || index} className="tm-canvas-basket-item-wrap">
                <div className="tm-basket-item">
                  <div data-src={item.imgUrl} className="tm-basket-img-wrap uk-background-contain" uk-img=""></div>
                  <div className="tm-basket-item-info">
                    <h3 className="tm-basket-item-head">{item.nameProduct}</h3>
                    <span>{item.variantName}</span>
                    <span>{typeof item.variantPrice === 'string' ? item.variantPrice : `${item.variantPrice} ${currency}`}</span>
                    <div className="tm-canvas-basket-item-count">
                      <span>{item.countVariant} {t('pc')}</span>
                      <button
                        className="tm-canvas-item-remove"
                        data-id={item.id}
                        data-name={item.variantName}
                        type="button"
                        onClick={deleteItem}
                        uk-close=""
                      ></button>
                    </div>
                  </div>
                </div>
              </div>
            ))}

            <div className="tm-basket-total">
              <table className="uk-table uk-table-divider">
                <tbody>
                  <tr>
                    <td>{t('delivery')}</td>
                    <td>
                      <span className={isFreeDelivery ? "tm-positive" : ""}>
                        {deliveryLabel}
                      </span>
                    </td>
                  </tr>
                  {showDeliveryFreeCanvas && (
                    <tr>
                      <td>{t('deliveryFreeCanvas')}</td>
                      <td>{t('deliveryFreeCanvasValue')}</td>
                    </tr>
                  )}
                  {showSaleCanvas && (
                    <tr>
                      <td>{t('saleCanvas')}</td>
                      <td>{t('saleCanvasValue')}</td>
                    </tr>
                  )}
                  {sale > 0 && (
                    <tr>
                      <td>{t('sale')}</td>
                      <td>-{sale} {currency}</td>
                    </tr>
                  )}
                  <tr>
                    <td>{t('totalprice')}</td>
                    <td>{sum} {currency}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="tm-basket-footer">
              <Link href="/basket" onClick={(e) => closeCanvas(e, '/basket')} className="tm-button tm-bare-button">
                {t('basket')}
              </Link>
              <Link href="/basket/checkout" onClick={(e) => closeCanvas(e, '/basket/checkout')} className="tm-button tm-black-button">
                {t('checkout')}
              </Link>
            </div>
          </div>
        ) : (
          <p className="uk-text-center">{t('emptybasket')}</p>
        )}
      </div>
    </div>
  );
};

export default Canvas;
