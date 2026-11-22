import React from "react";
import { useTranslation } from "@/hooks/useTranslation";
import { CompanyDataState, CheckoutErrors } from "@/types/shop";

interface CorporateProps {
  state: CompanyDataState;
  setState: React.Dispatch<React.SetStateAction<CompanyDataState>>;
  /** IČO/DIČ format errors from checkout. The account page doesn't validate them, so this is optional. */
  error?: Pick<CheckoutErrors, "ico" | "dic">;
  clearError?: (name: "ico" | "dic") => void;
}

const Corporate = ({ state, setState, error, clearError }: CorporateProps) => {
  const { t } = useTranslation();

  const handleChange = (name: keyof CompanyDataState, value: string): void => {
    setState((prev) => ({ ...prev, [name]: value }));
    if (name === "ico" || name === "dic") clearError?.(name);
  };

  return (
    <div>
      <div className="form_column">
        <div className="input_item">
          <input 
            className={state.companyName?.length ? "hasValue" : undefined}
            type="text"
            value={state.companyName}
            onChange={(e) => handleChange("companyName", e.target.value)}
          />
          <label>{t("companyName")}</label>
        </div>
        <div className="input_item"></div>
      </div>
      <div className="form_column">
        <div className="input_item">
          <input
            className={`${state.ico?.length ? "hasValue" : ""} ${error?.ico ? "invalid" : ""}`}
            aria-invalid={error?.ico || undefined}
            aria-describedby={error?.ico ? "company-ico-error" : undefined}
            type="text"
            value={state.ico}
            onChange={(e) => handleChange("ico", e.target.value)}
          />
          <label>{t("ico")}</label>
          {error?.ico && (
            <span id="company-ico-error" className="field_error" role="alert">
              {t("fieldErrorIco")}
            </span>
          )}
        </div>
        <div className="input_item"></div>
      </div>
      <div className="form_column">
        <div className="input_item">
          <input
            className={`${state.dic?.length ? "hasValue" : ""} ${error?.dic ? "invalid" : ""}`}
            aria-invalid={error?.dic || undefined}
            aria-describedby={error?.dic ? "company-dic-error" : undefined}
            type="text"
            value={state.dic}
            onChange={(e) => handleChange("dic", e.target.value)}
          />
          <label>{t("dic")}</label>
          {error?.dic && (
            <span id="company-dic-error" className="field_error" role="alert">
              {t("fieldErrorDic")}
            </span>
          )}
        </div>
        <div className="input_item"></div>
      </div>
    </div>
  );
};

export default Corporate;
