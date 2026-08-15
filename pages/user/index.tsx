import { useState, useEffect, useContext } from "react";
import AnimateHeight from "react-animate-height";
// Reuses the same delivery/company-data form components as checkout instead of the
// account page's own older copies (components/User/*), which duplicated this UI and
// had drifted enough to carry a since-fixed prop-mutation bug the checkout versions
// never had.
import Delivery from "@/components/Checkout/components/delivery";
import Corporate from "@/components/Checkout/components/corporate";
import { DataStateContext } from "@/context/dataStateContext";
import { AxiosAPI } from "@/restClient";
import Page from "@/layout/Page";
import validationForm from "@/functions/validationForm";
import { useRouter } from "next/router";
import { useTranslation } from "@/hooks/useTranslation";
import type {
  AddressState,
  CompanyDataState,
  CheckoutErrors,
} from "@/types/shop";

// See src/pages/basket/index.tsx for why this trivial getServerSideProps is required:
// pages with no data-fetching function fail to hydrate on a direct/fresh load on this
// Next.js/Turbopack version, which would silently break the login/account forms here.
export async function getServerSideProps() {
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
    } else if (!state.phone.length) {
      setError({ ...error, phone: true });
      return;
    } else if (!state.code.length) {
      setError({ ...error, code: true });
      return;
    }

    if (onBlur("email")) return;

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
    } catch (err) {
      console.error("Failed to save account:", err);
      setError((prev) => ({ ...prev, submit: true }));
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
    <Page className="basket user">
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
                        {item.sum} {" " + currency}
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
