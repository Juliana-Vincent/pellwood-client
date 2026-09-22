import React from "react";
import { useRouter } from "next/router";
import AnimateHeight from "react-animate-height";
import Delivery from "./components/delivery";
import Corporate from "./components/corporate";
import Note from "./components/note";
import ShipPay from "./components/shipPay";
import { useTranslation } from "@/hooks/useTranslation";

import type { CheckoutProps, CheckoutState } from "@/types/shop";

const Checkout = ({
  state,
  setState,
  error,
  setError,
  user,
  sumBefore,
  anotherAdress,
  setAnotherAdress,
  companyData,
  setCompanyData,
  password,
  setPassword,
  note,
  setNote,
  deliveryMethod,
  setDeliveryMethod,
  errorAnother,
  setErrorAnother,
  paymentMethod,
  setPaymentMethod,
  onBlur,
  deliveryOptions,
  paymentOptions,
  deliveryFreeThreshold,
}: CheckoutProps) => {
  const router = useRouter();
  const { t } = useTranslation();

  const handleChange = (name: keyof CheckoutState, value: any) => {
    setError((prev) => ({ ...prev, [name]: false }));
    setState((prev) => ({ ...prev, [name]: value }));
  };

  return (
    <div className="tm-checkout">
      <form id="checkout-form">
        <fieldset className="uk-fieldset">
          <legend className="uk-legend">{t("deliveryDetails")}</legend>

          <Delivery
            state={state}
            setState={setState as React.Dispatch<React.SetStateAction<any>>}
            error={error}
            setError={setError}
            onBlur={onBlur}
          />

          <div>
            <div className="uk-margin checkbox_item">
              <input
                type="checkbox"
                id="checkbox_another_address"
                onChange={() =>
                  handleChange(
                    "anotherAddressCheck",
                    !state.anotherAddressCheck,
                  )
                }
                checked={!!state.anotherAddressCheck}
              />
              <label htmlFor="checkbox_another_address"></label>
              <label htmlFor="checkbox_another_address">
                {t("checkdifferentadress")}
              </label>
            </div>

            <AnimateHeight
              duration={500}
              height={state.anotherAddressCheck ? "auto" : 0}
            >
              {state.anotherAddressCheck && (
              <Delivery section="shipping"
                state={anotherAdress}
                setState={
                  setAnotherAdress as React.Dispatch<React.SetStateAction<any>>
                }
                error={errorAnother}
                setError={setErrorAnother}
                onBlur={onBlur}
              />)}
            </AnimateHeight>
          </div>

          <div className="">
            <div className="uk-margin checkbox_item">
              <input
                type="checkbox"
                id="checkbox_firm_data"
                onChange={() =>
                  handleChange("companyDataCheck", !state.companyDataCheck)
                }
                checked={!!state.companyDataCheck}
              />
              <label htmlFor="checkbox_firm_data"></label>
              <label htmlFor="checkbox_firm_data">
                {t("checkcompanydata")}
              </label>
            </div>

            <AnimateHeight
              duration={500}
              height={state.companyDataCheck ? "auto" : 0}
            >
              <Corporate state={companyData} setState={setCompanyData} />
            </AnimateHeight>
          </div>

          <div className="">
            <div className="uk-margin checkbox_item">
              <input
                type="checkbox"
                id="checkbox_note"
                onChange={() => handleChange("noteCheck", !state.noteCheck)}
                checked={!!state.noteCheck}
              />
              <label htmlFor="checkbox_note"></label>
              <label htmlFor="checkbox_note">{t("chceknote")}</label>
            </div>

            <AnimateHeight duration={500} height={state.noteCheck ? "auto" : 0}>
              <Note state={note} setState={setNote} />
            </AnimateHeight>
          </div>

          {/* 
            TODO: If user registration is enabled in the future, uncomment this block.
            {user?.email === undefined ? (
              <div className="">
                <div className="uk-margin checkbox_item">
                  <input 
                    type="checkbox" 
                    id="checkbox_registration" 
                    onChange={() => handleChange('registrationCheck', !state.registrationCheck)} 
                    checked={!!state.registrationCheck} 
                  />
                  <label htmlFor="checkbox_registration"></label>
                  <label htmlFor="checkbox_registration">{t('chcekcreatecaccout')}</label>
                </div>
            
                <AnimateHeight duration={500} height={state.registrationCheck ? 'auto' : 0}>
                  <Password state={password} setState={setPassword} />
                </AnimateHeight>
              </div>
            ) : null} 
          */}

          <ShipPay
            error={error}
            setError={setError}
            delivery={deliveryMethod}
            setDelivery={setDeliveryMethod}
            payment={paymentMethod}
            sumBefore={sumBefore}
            setPayment={setPaymentMethod}
            deliveryOptions={deliveryOptions}
            paymentOptions={paymentOptions}
            deliveryFreeThreshold={deliveryFreeThreshold}
          />
        </fieldset>
      </form>
    </div>
  );
};

export default Checkout;
