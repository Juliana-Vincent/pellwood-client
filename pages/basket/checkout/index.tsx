import { useState, useEffect, useContext } from "react";
import { AxiosAPI } from "@/restClient";
import { DataStateContext, DataState } from "@/context/dataStateContext";
import Page from "@/layout/Page";
import Head from "@/components/Head";
import Checkout from "@/components/Checkout";
import Total from "@/components/Total";
import AcceptInfo from "@/components/AcceptInfo";
import ButtonsSubmit from "@/components/ButtonsSubmit";
import validationForm, { validationEmail } from "@/functions/validationForm";
import sumTotal from "@/functions/sumTotal";
import { fetchAPI } from "@/lib/strapi";
import localize from "@/data/localize";
import {
  resolveDeliveryData,
  resolvePaymentData,
  ShippingOption,
} from "@/functions/shippingOptions";
import { resolvePricingRules, PricingRules } from "@/functions/pricingRules";
import { useTranslation } from "@/hooks/useTranslation";
import {
  CheckoutState,
  AddressState,
  CompanyDataState,
  DeliveryMethodState,
  PaymentMethodState,
  CheckoutErrors,
  BasketItem,
} from "@/types/shop";
import type { Setting } from "@/types/setting";
import type { GetServerSidePropsContext } from "next";

// This page always needs a real data-fetching function anyway (see src/pages/basket/
// index.tsx for why - pages with none fail to hydrate on a direct/fresh load on this
// Next.js/Turbopack version), so it doubles as the fetch for CMS-configured shipping/
// pricing settings. Falls back to the hardcoded shippingOptions.ts/pricingRules.ts
// defaults (via resolveDeliveryData/resolvePaymentData/resolvePricingRules, called
// below with settings=null) if Strapi is unreachable - checkout must not go down with it.
export async function getServerSideProps({ locale }: GetServerSidePropsContext) {
  const { lang } = localize(locale);
  const strapiLocale = lang === "cz" ? "cs" : lang;

  let settings: Partial<Setting> | null = null;
  try {
    const settingRes = await fetchAPI<Setting>("setting", {
      locale: strapiLocale,
      populate: { deliveryOptions: true, paymentOptions: true },
    });
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
  const { t, lang, currency } = useTranslation();
  const { dataContextState, dataContextDispatch } =
    useContext(DataStateContext);

  const typedLang = lang as "cz" | "en";
  const deliveryOptions: ShippingOption[] = resolveDeliveryData(settings || undefined, typedLang);
  const paymentOptions: ShippingOption[] = resolvePaymentData(settings || undefined, typedLang);
  const pricingRules: PricingRules = resolvePricingRules(settings || undefined, typedLang);
  const [sum, setSum] = useState<number | string>(0);
  const [sumBefore, setSumBefore] = useState<number | string>(0);
  const [sale, setSale] = useState<number | string>(0);
  // Read straight from context on every render (not a frozen useState snapshot) so a
  // fresh page load (refresh, bookmark) sees the real basket once cookies are restored,
  // instead of permanently treating it as empty and later kicking the customer out of
  // checkout when they submit the order.
  const basketKey = `basket${lang}` as keyof DataState;
  const basket = (dataContextState[basketKey] as BasketItem[]) || [];
  const [user, setUser] = useState(dataContextState.user);

  const [state, setState] = useState<CheckoutState>({
    email: user?.email || "",
    phone: user?.phone || "",
    name: user?.name || "",
    surname: user?.surname || "",
    country: lang === "cz" ? "cz" : "de",
    city: user?.city || "",
    address: user?.address || "",
    code: user?.code || "",
    anotherAddressCheck: false,
    companyDataCheck: false,
    registrationCheck: false,
    noteCheck: false,
  });

  const [anotherAdress, setAnotherAdress] = useState<AddressState>({
    email: "",
    phone: "",
    name: "",
    surname: "",
    country: lang === "cz" ? "cz" : "de",
    city: "",
    address: "",
    code: "",
  });

  const [companyData, setCompanyData] = useState<CompanyDataState>({
    companyName: "",
    ico: "",
    dic: "",
  });

  const [password, setPassword] = useState("");
  const [note, setNote] = useState("");

  const [deliveryMethod, setDeliveryMethod] = useState<DeliveryMethodState>({
    value: "",
    price: "",
    payOnline: false,
  });

  const [paymentMethod, setPaymentMethod] = useState<PaymentMethodState>({
    value: "",
    price: "",
    payOnline: false,
  });

  const [error, setError] = useState<CheckoutErrors>({
    email: false,
    phone: false,
    name: false,
    surname: false,
    city: false,
    address: false,
    code: false,
    delivery: false,
    payment: false,
  });

  const [errorAnother, setErrorAnother] = useState<CheckoutErrors>({
    email: false,
    phone: false,
    name: false,
    surname: false,
    city: false,
    address: false,
    code: false,
  });

  useEffect(() => {
    setUser(dataContextState.user);
    setState((prev) => ({ ...prev, ...dataContextState.user }));
  }, [dataContextState.user]);

  useEffect(() => {
    sumTotal(0, 0, basket, setSumBefore, setSale, setSum, typedLang, pricingRules);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [basket]);

  useEffect(() => {
    sumTotal(
      deliveryMethod.price,
      paymentMethod.price,
      basket,
      setSumBefore,
      setSale,
      setSum,
      typedLang,
      pricingRules,
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deliveryMethod, paymentMethod, basket]);

  const onBlur = (type: any) => {
    if (validationForm(type, state, error, setError as any)) {
      return true;
    }
    return false;
  };

  const sendOrder = async () => {
    // Validate every field in one pass and report all of them together - the old
    // code returned on the very first failing check, so a customer with several
    // empty fields only ever saw one error at a time and had to resubmit
    // repeatedly to discover the next one.
    const nextErrors: CheckoutErrors = {
      ...error,
      submit: false,
      address: !state.address.length,
      city: !state.city.length,
      surname: !state.surname.length,
      name: !state.name.length,
      phone: !state.phone.length,
      code: !state.code.length,
      email: !validationEmail(state.email),
      delivery: !deliveryMethod.value.length,
      payment: !paymentMethod.value.length,
    };

    setError(nextErrors);
    if (Object.values(nextErrors).some(Boolean)) {
      return;
    }

    if (!basket.length) {
      window.location.href = "/";
      return;
    }

    const dataOrder = {
      basket,
      sum,
      status: "PENDING",
      user: {
        ...state,
        anotherAdress: anotherAdress,
        companyData: companyData,
        password: password,
      },
      delivery: deliveryMethod,
      payment: paymentMethod,
      note: note,
      currency: currency,
    };

    if (state.registrationCheck) {
      // The POST handler expects a flat {email, password} body; the PUT handler is the
      // one that accepts this {data, type} shape and actually creates the account.
      AxiosAPI.put(`/user`, { data: dataOrder.user, type: "create" }).then(
        (res) => dataContextDispatch({ state: res.data.data, type: "user" }),
      );
    }

    await AxiosAPI.post(`/order`, dataOrder)
      .then((res) => {
        if (dataOrder.payment.payOnline) {
          window.location.href = decodeURIComponent(res.data.data.redirect);
        } else {
          window.location.href = `/thank-you?refId=${res.data.data.idOrder}&dobirka=true`;
        }
      })
      .catch((err) => {
        // A DB hiccup, a Strapi price mismatch, a network blip - whatever the cause,
        // the customer needs to know their order was NOT placed rather than staring
        // at an unresponsive button. Reuses the same banner shown for validation
        // errors above.
        console.error("Order submission failed:", err);
        setError({ ...error, submit: true });
      });
  };

  return (
    <Page className="basket" title={t("order")}>
      <div className="tm-basket-content-wrap">
        <div className="tm-basket-content">
          <Head />
          <Checkout
            state={state}
            setState={setState}
            error={error}
            setError={setError}
            user={user}
            anotherAdress={anotherAdress}
            setAnotherAdress={setAnotherAdress}
            companyData={companyData}
            setCompanyData={setCompanyData}
            password={password}
            setPassword={setPassword}
            note={note}
            setNote={setNote}
            deliveryMethod={deliveryMethod}
            setDeliveryMethod={setDeliveryMethod}
            errorAnother={errorAnother}
            setErrorAnother={setErrorAnother}
            paymentMethod={paymentMethod}
            setPaymentMethod={setPaymentMethod}
            sumBefore={sumBefore}
            onBlur={onBlur}
            deliveryOptions={deliveryOptions}
            paymentOptions={paymentOptions}
            deliveryFreeThreshold={pricingRules.deliveryFreeThreshold}
          />
        </div>
      </div>
      <div className="basket-right-panel">
        <div className="basket-right-content">
          <Total
            isEnd={true}
            sum={sum}
            basket={basket}
            deliveryFreeThreshold={pricingRules.deliveryFreeThreshold}
            sale={sale}
            sumBefore={sumBefore}
            delivery={deliveryMethod.price}
            payment={paymentMethod.price}
          />
          <div>
            <p>{t("infovat")}</p>
            <AcceptInfo />
          </div>
          <div className="tm-basket-footer tm-footer-single total-end-footer">
            {Object.values(error).indexOf(true) >= 0 && (
              <div
                className="uk-alert-danger uk-width-1-1 uk-text-center"
                uk-alert=""
              >
                <p>{t("errorSendOrder")}</p>
              </div>
            )}
            <ButtonsSubmit sendOrder={sendOrder} />
          </div>
        </div>
      </div>
    </Page>
  );
};

export default Basket;
