import { useState, useEffect, useContext } from "react";
import AnimateHeight from "react-animate-height";
import type { GetServerSidePropsContext } from "next";
import { getSessionUser } from "@/lib/session";
import Delivery from "@/components/Checkout/components/delivery";
import Corporate from "@/components/Checkout/components/corporate";
import { DataStateContext } from "@/context/dataStateContext";
import { AxiosAPI } from "@/restClient";
import Page from "@/layout/Page";
import validationForm, { validationCode, validationPhone } from "@/functions/validationForm";
import { useRouter } from "next/router";
import { useTranslation } from "@/hooks/useTranslation";
import type {
  AddressState,
  CompanyDataState,
  CheckoutErrors,
} from "@/types/shop";

export async function getServerSideProps({ req, locale }: GetServerSidePropsContext) {
  const sessionUser = await getSessionUser(req);

  if (!sessionUser) {
    return {
      redirect: {
        destination: locale === "en" ? "/en" : "/",
        // locale: false because the prefix is already in the destination above - without it Next would add its own and produce /en/en.
        locale: false,
        permanent: false,
      },
    };
  }

  return { props: {} };
}

const User = () => {
  const router = useRouter();
  const { t, lang, currency } = useTranslation();
  const { dataContextState, dataContextDispatch } =
    useContext(DataStateContext);
  const user = dataContextState?.user || {};

  const [orders, setOrders] = useState<any[]>([]);

  const [state, setState] = useState({
    email: user.email || "",
    phone: user.phone || "",
    name: user.name || "",
    surname: user.surname || "",
    country: user.country || "",
    city: user.city || "",
    address: user.address || "",
    code: user.code || "",
    anotherAddressCheck: false,
    companyDataCheck: false,
  });

  const [error, setError] = useState<CheckoutErrors>({
    email: false,
    phone: false,
    name: false,
    surname: false,
    city: false,
    address: false,
    code: false,
  });

  const [saved, setSaved] = useState(false);

  const [anotherAdress, setAnotherAdress] = useState<AddressState>({
    email: "",
    phone: "",
    name: "",
    surname: "",
    country: "",
    city: "",
    address: "",
    code: "",
    ...user.anotherAdress,
  });
  const [companyData, setCompanyData] = useState<CompanyDataState>({
    companyName: "",
    ico: "",
    dic: "",
    ...user.companyData,
  });

  const [prefilled, setPrefilled] = useState(false);
  useEffect(() => {
    if (prefilled || !dataContextState.hydrated || !user?.email) return;

    setState((prev) => ({
      ...prev,
      email: user.email || "",
      phone: user.phone || "",
      name: user.name || "",
      surname: user.surname || "",
      country: user.country || "",
      city: user.city || "",
      address: user.address || "",
      code: user.code || "",
    }));
    setAnotherAdress((prev) => ({ ...prev, ...(user.anotherAdress || {}) }));
    setCompanyData((prev) => ({ ...prev, ...(user.companyData || {}) }));
    setPrefilled(true);
    // `prefilled` guards against a later dispatch - the /api/user/me
    // reconciliation, say - overwriting edits the customer has already started.
  }, [prefilled, dataContextState.hydrated, user]);

  useEffect(() => {
    if (state.email) {
      AxiosAPI.get(`/order/email/${state.email}`)
        .then((res) => {
          setOrders(res.data.data);
        })
        .catch((err) => {
          console.error("Failed to fetch orders:", err);
        });
    }
  }, [state.email]);

  useEffect(() => {
    if (!saved) return;
    const timer = setTimeout(() => setSaved(false), 4000);
    return () => clearTimeout(timer);
  }, [saved]);

  useEffect(() => {
    setSaved(false);
  }, [state, anotherAdress, companyData]);

  const handleChange = (name: string, value: any) => {
    setState((prevState) => ({
      ...prevState,
      [name]: value,
    }));
  };

  const onBlur = (type: string) => {
    // validationForm's own setError param predates CheckoutErrors (see the same cast
    // in components/Checkout/index.tsx's onBlur) - the runtime shape matches fine.
    if (validationForm(type, state, error, setError as any)) {
      return true;
    }
    return false;
  };

  const onSave = async () => {
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
    } else if (!validationPhone(state.phone)) {
      setError({ ...error, phone: true });
      return;
    } else if (!validationCode(state.code, state.country)) {
      setError({ ...error, code: true });
      return;
    }

    if (onBlur("email")) return;

    //The server ignores it
    let saveData = {
      id: user._id || user.id,
      ...state,
      anotherAdress: anotherAdress,
      companyData: companyData,
    };

    try {
      const res = await AxiosAPI.put(`/user`, {
        data: saveData,
        type: "update",
      });
      dataContextDispatch({ state: res.data.data, type: "user" });
      setError((prev) => ({ ...prev, submit: false }));
      setSaved(true);
    } catch (err) {
      console.error("Failed to save account:", err);
      setError((prev) => ({ ...prev, submit: true }));
      setSaved(false);
    }
  };

  const onLogout = () => {
    // Clearing the client-side "user" cookie alone leaves the real auth session
    // (httpOnly, so this code can't touch it) live server-side.
    AxiosAPI.post(`/user/logout`).catch((err) => {
      console.error("Failed to clear session:", err);
    });
    dataContextDispatch({ state: {}, type: "user" });
    router.push("/");
  };

  return (
    <Page className="basket user" title={t("yourAccount")} noCrawl>
      <div className="tm-basket-content-wrap">
        <div className="tm-basket-content">
          <div className="tm-basket-head">
            <h1>{t("yourAccount")}</h1>
          </div>
          {error.submit && (
            <div className="uk-alert-danger" uk-alert="">
              <p>{t("errorSendOrder")}</p>
            </div>
          )}
          {saved && (
            <div className="uk-alert-success" uk-alert="">
              <p>{t("accountSaved")}</p>
            </div>
          )}
          <Delivery
            state={state}
            // This page's state carries two extra fields (anotherAddressCheck,
            // companyDataCheck) beyond AddressState, same reason Checkout/index.tsx
            // casts its own setState when wiring this shared component.
            setState={
              setState as React.Dispatch<React.SetStateAction<AddressState>>
            }
            error={error}
            setError={setError}
            onBlur={onBlur}
            disableEmail
          />

          <div className="uk-margin-small checkbox_item">
            <input
              type="checkbox"
              id="checkbox_firm_data"
              onChange={() =>
                handleChange("companyDataCheck", !state.companyDataCheck)
              }
              checked={state.companyDataCheck}
            />
            <label htmlFor="checkbox_firm_data"></label>
            <label htmlFor="checkbox_firm_data">{t("checkcompanydata")}</label>
          </div>

          <AnimateHeight
            duration={500}
            height={state.companyDataCheck ? "auto" : 0}
          >
            <Corporate state={companyData} setState={setCompanyData} />
          </AnimateHeight>

          <hr />

          <div className="form_column">
            <div>
              <button
                className="tm-button tm-bare-button"
                onClick={() => onLogout()}
              >
                {t("logOut")}
              </button>
            </div>
            <div className="uk-text-right">
              <button
                className="tm-button tm-black-button"
                onClick={(e) => onSave()}
              >
                {t("save")}
              </button>
            </div>
          </div>
        </div>
      </div>
      <div className="basket-right-panel">
        <div className="basket-right-content">
          <div className="last_order_wrap tm-total-end">
            <table className="uk-table uk-table-small uk-table-divider">
              <thead>
                <tr>
                  <th colSpan={2}>{t("orderHistory")}</th>
                </tr>
              </thead>
              <tbody>
                {orders?.length ? (
                  orders.map((item: any) => (
                    <tr key={item._id || item.idOrder}>
                      <td>
                        {t("orderNumber")} {item.idOrder}
                      </td>
                      <td className="uk-text-right">
                        {/* The order's own currency, not the one the page happens
                            to be in - a 1500 Kc order read "1500 EUR" on /en/user. */}
                        {item.sum} {" " + (item.currency || currency)}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td>{t("noOrder")}</td>
                    <td className="uk-text-right"></td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </Page>
  );
};

export default User;
