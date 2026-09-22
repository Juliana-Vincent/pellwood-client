import React from "react";
import { useTranslation } from "@/hooks/useTranslation";
import { CompanyDataState } from "@/types/shop";

interface CorporateProps {
  state: CompanyDataState;
  setState: React.Dispatch<React.SetStateAction<CompanyDataState>>;
}

const Corporate = ({ state, setState }: CorporateProps) => {
  const { t } = useTranslation();

  const handleChange = (name: keyof CompanyDataState, value: string): void => {
    setState((prev) => ({ ...prev, [name]: value }));
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
            className={state.ico?.length ? "hasValue" : undefined}
            type="text"
            value={state.ico}
            onChange={(e) => handleChange("ico", e.target.value)}
          />
          <label>{t("ico")}</label>
        </div>
        <div className="input_item"></div>
      </div>
      <div className="form_column">
        <div className="input_item">
          <input
            className={state.dic?.length ? "hasValue" : undefined}
            type="text"
            value={state.dic}
            onChange={(e) => handleChange("dic", e.target.value)}
          />
          <label>{t("dic")}</label>
        </div>
        <div className="input_item"></div>
      </div>
    </div>
  );
};

export default Corporate;
