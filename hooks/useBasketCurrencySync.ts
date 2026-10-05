import { useContext, useEffect, useRef, useState } from "react";
import { useRouter } from "next/router";
import { DataStateContext, DataState } from "@/context/dataStateContext";
import { AxiosAPI } from "@/restClient";
import localize from "@/data/localize";
import type { BasketItem } from "@/types/shop";

export interface BasketCurrencyNotice {
  converted: number;
  dropped: string[];
}

/**
 * Baskets are stored per language (basketcz in Kc, basketen in EUR), so switching
 * language used to show an empty basket and the customer silently lost their
 * selection. On a switch, carry the other language's basket over and re-price it
 * from that locale's catalogue.
 *
 * Only runs when the language the customer just switched to has an EMPTY basket -
 * if they already have items there, those are theirs and must not be overwritten.
 */
export function useBasketCurrencySync() {
  const router = useRouter();
  const { dataContextState, dataContextDispatch } = useContext(DataStateContext);
  const [notice, setNotice] = useState<BasketCurrencyNotice | null>(null);
  const inFlight = useRef(false);

  const { lang } = localize(router.locale);

  useEffect(() => {
    if (!dataContextState.hydrated || inFlight.current) return;

    const toLang = lang === "cz" ? "cz" : "en";
    const fromLang = toLang === "cz" ? "en" : "cz";

    const targetKey = `basket${toLang}` as keyof DataState;
    const sourceKey = `basket${fromLang}` as keyof DataState;

    const target = (dataContextState[targetKey] as BasketItem[]) || [];
    const source = (dataContextState[sourceKey] as BasketItem[]) || [];

    if (target.length || !source.length) return;

    inFlight.current = true;

    AxiosAPI.post(`/basket/convert`, { items: source, fromLang, toLang })
      .then((res) => {
        const items = res.data?.items || [];
        const dropped = res.data?.dropped || [];

        if (items.length) {
          dataContextDispatch({
            state: items,
            type: targetKey as "basketcz" | "basketen",
          });
          // The badge counts everything in the basket, greyed lines included -
          // they are still the customer's selection. Checkout is what refuses an
          // order containing them.
          dataContextDispatch({
            state: items.length,
            type: `basketCount${toLang}` as "basketCountcz" | "basketCounten",
          });
        }

        // Clear the old language's basket so the two can't drift apart and the
        // customer isn't charged twice for the same selection.
        dataContextDispatch({
          state: [],
          type: sourceKey as "basketcz" | "basketen",
        });
        dataContextDispatch({
          state: 0,
          type: `basketCount${fromLang}` as "basketCountcz" | "basketCounten",
        });

        if (items.length || dropped.length) {
          setNotice({ converted: items.length, dropped });
        }
      })
      .catch((err) => {
        // The customer keeps the basket they had; nothing is destroyed on failure.
        console.error("Failed to convert basket to the new currency:", err);
      })
      .finally(() => {
        inFlight.current = false;
      });
  }, [lang, dataContextState.hydrated]);

  return { notice, dismissNotice: () => setNotice(null) };
}
