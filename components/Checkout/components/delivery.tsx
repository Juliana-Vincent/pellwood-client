import countryData from "@/data/country";
import { useTranslation } from "@/hooks/useTranslation";
import { AddressState, CheckoutErrors } from "@/types/shop";
import React from "react";

interface DeliveryProps {
  state: AddressState;
  setState: React.Dispatch<React.SetStateAction<AddressState>>;
  error: CheckoutErrors;
  setError: React.Dispatch<React.SetStateAction<CheckoutErrors>>;
  onBlur: (type: keyof CheckoutErrors) => void;
  /** The account page reuses this form for a signed-in user's saved address, whose
   *  email the backend deliberately never lets this endpoint change (see
   *  UPDATABLE_FIELDS in pages/api/user/index.ts) - editing it there did nothing
   *  and gave no indication why, so it's read-only wherever this is true. Checkout
   *  (the only other caller) genuinely needs it editable for a guest's email. */
  disableEmail?: boolean;
  section?: "billing" | "shipping";
}

const Delivery = ({
  state,
  setState,
  error,
  onBlur,
  setError,
  disableEmail,
  section = "billing",
}: DeliveryProps) => {
  const { t, lang } = useTranslation();

  const handleChange = (name: keyof AddressState, value: string) => {
    setError((prev) => ({ ...prev, [name]: false }));
    setState((prev) => ({ ...prev, [name]: value }));
  };

  const field = (name: keyof AddressState, token: string) => ({
    id: `${section}-${name}`,
    name: `${section}-${name}`,
    autoComplete: token,
  });

  return (
    <div>
      <div className="form_column">
        <div className="input_item">
          <input {...field("email", "email")}
            className={`${state.email.length ? "hasValue" : ""} ${error.email ? "invalid" : ""}`}
            type="email"
            onBlur={() => onBlur("email")}
            value={state.email}
            onChange={(e) => handleChange("email", e.target.value)}
            readOnly={disableEmail}
            title={disableEmail ? t("emailChangeUnavailable") : undefined}
          />
          <label htmlFor={`${section}-email`}>{t("formemail")}</label>
        </div>
        <div className="input_item">
          <input {...field("phone", "tel")}
            className={`${state.phone.length ? "hasValue" : ""} ${error.phone ? "invalid" : ""}`}
            type="text"
            value={state.phone}
            onChange={(e) => handleChange("phone", e.target.value)}
          />
          <label htmlFor={`${section}-phone`}>{t("formphone")}</label>
        </div>
      </div>
      <div className="form_column">
        <div className="input_item">
          <input {...field("name", "name")}
            className={`${state.name.length ? "hasValue" : ""} ${error.name ? "invalid" : ""}`}
            type="text"
            value={state.name}
            onChange={(e) => handleChange("name", e.target.value)}
          />
          <label htmlFor={`${section}-name`}>{t("formname")}</label>
        </div>
        <div className="input_item">
          <input {...field("surname", "family-name")}
            className={`${state.surname.length ? "hasValue" : ""} ${error.surname ? "invalid" : ""}`}
            type="text"
            value={state.surname}
            onChange={(e) => handleChange("surname", e.target.value)}
          />
          <label htmlFor={`${section}-surname`}>{t("formsurname")}</label>
        </div>
      </div>
      <div className="form_column">
        <div className="select_item">
          {/* UIkit's uk-form-custom auto-init adds a className to this div in the window
              between initial paint and React's hydration walk - same UIkit-vs-hydration
              conflict fixed elsewhere this session (e.g. pages/produkt/[product].tsx's
              custom-select). suppressHydrationWarning covers that className.
              The selected option's label is rendered by React itself (below) instead of
              relying on uk-form-custom's own target-copy behavior: copying it in via
              UIkit turns "zero children" into "one text child", which is a structural
              mismatch suppressHydrationWarning can't paper over (it only covers a
              differing value of a child React already expects to render). Rendering the
              real label makes UIkit's copy redundant instead of conflicting. */}
          <div uk-form-custom="target: > * > span:first-child" suppressHydrationWarning>
            <select
              value={state.country}
              onChange={(e) => handleChange("country", e.target.value)}
            >
              {countryData[lang as keyof typeof countryData].map(
                (item: any, index: number) => (
                  <option key={index} value={item.name}>
                    {item.value}
                  </option>
                ),
              )}
            </select>
            <button
              className="uk-button uk-button-default"
              type="button"
            >
              <span>
                {
                  countryData[lang as keyof typeof countryData].find(
                    (item: any) => item.name === state.country,
                  )?.value
                }
              </span>
              <span>
                <svg
                  aria-hidden="true"
                  focusable="false"
                  data-prefix="fal"
                  data-icon="chevron-down"
                  role="img"
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 448 512"
                >
                  <path
                    fill="currentColor"
                    d="M443.5 162.6l-7.1-7.1c-4.7-4.7-12.3-4.7-17 0L224 351 28.5 155.5c-4.7-4.7-12.3-4.7-17 0l-7.1 7.1c-4.7 4.7-4.7 12.3 0 17l211 211.1c4.7 4.7 12.3 4.7 17 0l211-211.1c4.8-4.7 4.8-12.3.1-17z"
                  ></path>
                </svg>
              </span>
            </button>
          </div>
        </div>
        <div className="input_item">
          <input {...field("city", "address-level2")}
            className={`${state.city.length ? "hasValue" : ""} ${error.city ? "invalid" : ""}`}
            type="text"
            value={state.city}
            onChange={(e) => handleChange("city", e.target.value)}
          />
          <label htmlFor={`${section}-city`}>{t("formcity")}</label>
        </div>
      </div>
      <div className="form_column">
        <div className="input_item">
          <input {...field("address", "street-address")}
            className={`${state.address.length ? "hasValue" : ""} ${error.address ? "invalid" : ""}`}
            type="text"
            value={state.address}
            onChange={(e) => handleChange("address", e.target.value)}
          />
          <label htmlFor={`${section}-address`}>{t("formstreet")}</label>
        </div>
        <div className="input_item">
          <input {...field("code", "postal-code")}
            className={`${state.code.length ? "hasValue" : ""} ${error.code ? "invalid" : ""}`}
            type="text"
            value={state.code}
            onChange={(e) => handleChange("code", e.target.value)}
          />
          <label htmlFor={`${section}-code`}>{t("formzip")}</label>
        </div>
      </div>
    </div>
  );
};

export default Delivery;
