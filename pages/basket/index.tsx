import { useState, useEffect, useContext } from "react";
import Page from "@/layout/Page";
import { DataStateContext, DataState } from "@/context/dataStateContext";
import Head from "@/components/Head";
import Body from "@/components/Body";
import Total from "@/components/Total";
import ButtonsSubmit from "@/components/ButtonsSubmit";
import sumTotal from "@/functions/sumTotal";
import { fetchAPI } from "@/lib/strapi";
import localize from "@/data/localize";
import { resolvePricingRules, PricingRules } from "@/functions/pricingRules";
import { useTranslation } from "@/hooks/useTranslation";
import type { BasketItem } from "@/types/shop";
import type { Setting } from "@/types/setting";
import type { GetServerSidePropsContext } from "next";

// A page with no data-fetching function at all is fully static-optimized by Next.js;
// on this Next.js/Turbopack version that optimization silently fails to hydrate on a
// direct/fresh page load (refresh, bookmark, new tab) - the page renders but never
// becomes interactive. This basket page needs client interactivity (quantity controls,
// item removal, checkout), so give it a real getServerSideProps to force it onto the
// server-rendered path, which hydrates reliably. Basket contents are per-visitor cookies
// anyway, so SSR is the semantically correct fetch mode here, not a workaround hack.
// It also fetches the CMS-configured free-delivery threshold, falling back to the
// hardcoded pricingRules.ts default (via resolvePricingRules, settings=null) if Strapi
// is unreachable.
export async function getServerSideProps({ locale }: GetServerSidePropsContext) {
  const { lang } = localize(locale);
  const strapiLocale = lang === "cz" ? "cs" : lang;

  let settings: Partial<Setting> | null = null;
  try {
    const settingRes = await fetchAPI<Setting>("setting", { locale: strapiLocale });
    settings = settingRes.data || null;
  } catch (err) {
    console.error("Failed to fetch Strapi settings, using hardcoded pricing defaults:", err);
  }

  return { props: { settings } };
}

interface BasketProps {
  settings: Partial<Setting> | null;
}

const Basket = ({ settings }: BasketProps) => {
  const { t, lang } = useTranslation();
  const { dataContextState } = useContext(DataStateContext);
  const [sum, setSum] = useState<number | string>(0);
  const [sumBefore, setSumBefore] = useState<number | string>(0);
  const [sale, setSale] = useState<number | string>(0);
  // Read straight from context on every render (not a frozen useState snapshot) so the
  // basket reflects cookies once they're restored, instead of always seeing them as empty.
  const basketKey = `basket${lang}` as keyof DataState;
  const basket = (dataContextState[basketKey] as BasketItem[]) || [];
  // Body dispatches basket updates straight to context itself; this is only here to
  // satisfy its prop type.
  const setBasket = () => {};
  const pricingRules: PricingRules = resolvePricingRules(settings || undefined, lang as "cz" | "en");

  useEffect(() => {
    // Only redirect once cookies have actually finished loading - otherwise every fresh
    // page load (refresh, bookmark, new tab) sees a momentarily-empty basket and bounces
    // the customer to the homepage even though their cart has items.
    if (dataContextState.hydrated && !basket?.length) {
      window.location.href = "/";
    }
  }, [basket, dataContextState.hydrated]);

  useEffect(() => {
    sumTotal(0, 0, basket, setSumBefore, setSale, setSum, lang as "cz" | "en", pricingRules);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [basket]);

  return (
    <Page className="basket" title={t("basket")}>
      <div className="tm-basket-content-wrap">
        <div className="tm-basket-content">
          <Head />
          <Body
            setSum={setSum}
            sum={sum}
            basket={basket}
            setBasket={setBasket}
          />
        </div>
      </div>
      <div className="basket-right-panel">
        <div className="basket-right-content">
          <Total sum={sumBefore} sale={sale} deliveryFreeThreshold={pricingRules.deliveryFreeThreshold} />
          <div>
            <p>{t("infovat")}</p>
          </div>
          <div className="tm-basket-footer tm-footer-single total-end-footer">
            <ButtonsSubmit />
          </div>
        </div>
      </div>
    </Page>
  );
};

export default Basket;
