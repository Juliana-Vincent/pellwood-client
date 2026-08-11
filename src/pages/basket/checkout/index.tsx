import { useState, useEffect, useContext } from "react";
import { AxiosAPI } from "@/restClient";
import { DataStateContext } from "@/context/dataStateContext";
import Page from "@/layout/Page";
import Head from "@/components/Head";
import Checkout from "@/components/Checkout";
import Total from "@/components/Total";
import AcceptInfo from "@/components/AcceptInfo";
import ButtonsSubmit from "@/components/ButtonsSubmit";
import validationForm from "@/functions/validationForm";
import sumTotal from "@/functions/sumTotal";
import { useTranslation } from "@/hooks/useTranslation";
import {
  CheckoutState,
  AddressState,
  CompanyDataState,
  DeliveryMethodState,
  PaymentMethodState,
  CheckoutErrors,
} from "@/src/types/shop";

// See src/pages/basket/index.tsx for why this trivial getServerSideProps is required:
// pages with no data-fetching function fail to hydrate on a direct/fresh load on this
// Next.js/Turbopack version, which would silently break order submission here.
export async function getServerSideProps() {
  return { props: {} };
}

const Basket = () => {
  const { t, lang, currency } = useTranslation();
  const { dataContextState, dataContextDispatch } = useContext(
    DataStateContext
  ) as any;
  const [sum, setSum] = useState<number | string>(0);
  const [sumBefore, setSumBefore] = useState<number | string>(0);
  const [sale, setSale] = useState<number | string>(0);
  // Read straight from context on every render (not a frozen useState snapshot) so a
  // fresh page load (refresh, bookmark) sees the real basket once cookies are restored,
  // instead of permanently treating it as empty and later kicking the customer out of
  // checkout when they submit the order.
  const basket = dataContextState["basket" + lang] || [];
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
    sumTotal(0, 0, basket, setSumBefore, setSale, setSum, lang as "cz" | "en");
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
      lang as "cz" | "en"
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
    if (!state.address.length) {
      setError({ ...error, address: true });
      return;
    } else if (!state.city.length) {
      setError({ ...error, city: true });
      return;
    } else if (!state.surname.length) {
      setError({ ...error, surname: true });
      return;
    } else if (!state.name.length) {
      setError({ ...error, name: true });
      return;
    } else if (!state.phone.length) {
      setError({ ...error, phone: true });
      return;
    } else if (!state.code.length) {
      setError({ ...error, code: true });
      return;
    }

    if (onBlur("email")) return;

    if (!deliveryMethod.value.length) {
      setError({ ...error, delivery: true });
      return;
    }
    if (!paymentMethod.value.length) {
      setError({ ...error, payment: true });
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
        (res) => dataContextDispatch({ state: res.data.data, type: "user" })
      );
    }

    await AxiosAPI.post(`/order`, dataOrder).then((res) => {
      if (dataOrder.payment.payOnline) {
        window.location.href = decodeURIComponent(res.data.data.redirect);
      } else {
        window.location.href = `/thank-you?refId=${res.data.data.idOrder}&dobirka=true`;
      }
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
          />
        </div>
      </div>
      <div className="basket-right-panel">
        <div className="basket-right-content">
          <Total
            isEnd={true}
            sum={sum}
            basket={basket}
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
