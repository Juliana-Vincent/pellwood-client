import { useState, useEffect, useContext } from "react";
import Page from "@/layout/Page";
import { DataStateContext } from "@/context/dataStateContext";
import Head from "@/components/Head";
import Body from "@/components/Body";
import Total from "@/components/Total";
import ButtonsSubmit from "@/components/ButtonsSubmit";
import sumTotal from "@/functions/sumTotal";
import { useTranslation } from "@/hooks/useTranslation";

// A page with no data-fetching function at all is fully static-optimized by Next.js;
// on this Next.js/Turbopack version that optimization silently fails to hydrate on a
// direct/fresh page load (refresh, bookmark, new tab) - the page renders but never
// becomes interactive. This basket page needs client interactivity (quantity controls,
// item removal, checkout), so give it a trivial getServerSideProps to force it onto the
// server-rendered path, which hydrates reliably. Basket contents are per-visitor cookies
// anyway, so SSR is the semantically correct fetch mode here, not a workaround hack.
export async function getServerSideProps() {
  return { props: {} };
}

const Basket = () => {
  const { t, lang } = useTranslation();
  const { dataContextState } = useContext(DataStateContext) as any;
  const [sum, setSum] = useState<number | string>(0);
  const [sumBefore, setSumBefore] = useState<number | string>(0);
  const [sale, setSale] = useState<number | string>(0);
  // Read straight from context on every render (not a frozen useState snapshot) so the
  // basket reflects cookies once they're restored, instead of always seeing them as empty.
  const basket = dataContextState["basket" + lang] || [];
  // Body dispatches basket updates straight to context itself; this is only here to
  // satisfy its prop type.
  const setBasket = () => {};

  useEffect(() => {
    // Only redirect once cookies have actually finished loading - otherwise every fresh
    // page load (refresh, bookmark, new tab) sees a momentarily-empty basket and bounces
    // the customer to the homepage even though their cart has items.
    if (dataContextState.hydrated && !basket?.length) {
      window.location.href = "/";
    }
  }, [basket, dataContextState.hydrated]);

  useEffect(() => {
    sumTotal(0, 0, basket, setSumBefore, setSale, setSum, lang as "cz" | "en");
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
          <Total sum={sumBefore} sale={sale} />
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
