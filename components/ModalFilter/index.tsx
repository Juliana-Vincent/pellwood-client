import React, { useState, useEffect, FC } from "react";
import CustomRangeSlider from "../CustomRangeSlider";
import { useTranslation } from "../../hooks/useTranslation";

interface RangeValue {
  min: number;
  max: number;
}

interface StateRange {
  length: RangeValue;
  diameter: RangeValue;
}

interface RangeNumber {
  length: RangeValue;
  diameter: RangeValue;
}

interface HandleChange {
  (name: keyof StateRange, value: RangeValue): void;
}

interface ModalFilterProps {
  setSearch: (value: string) => void;
  search: string;
  stateRange: StateRange;
  rangeNumber: RangeNumber;
  closeModal: () => void;
  handleFilter: () => void;
  setStateRange: (state: StateRange) => void;
}

const ModalFilter: FC<ModalFilterProps> = ({
  setSearch,
  search,
  stateRange,
  rangeNumber,
  closeModal,
  handleFilter,
  setStateRange,
}) => {
  const [mounted, setMounted] = useState(false);
  const { t } = useTranslation();

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleChange: HandleChange = (name, value) => {
    setStateRange({
      ...stateRange,
      [name]: value,
    });
  };

  if (!mounted) return null;

  return (
    // container: false keeps this modal in its original React-rendered position in
    // the DOM instead of UIkit's default of moving it to a direct child of <body> -
    // that move takes it outside Next's root container, which is where React
    // attaches its event delegation, so every onChange/onClick inside an unpatched
    // modal silently stops working the moment it's first opened (confirmed via
    // React DevTools-style fiber inspection: typing updated the raw DOM value, but
    // the component's own state never saw it). Applies to every uk-modal in the
    // app - see Login, ForgotPassword, ResetPassword.
    <div id="modal-filter" className="uk-flex-top" uk-modal="container: false">
      <div className="uk-modal-dialog uk-modal-body uk-margin-auto-vertical">
        <div className="tm-canvas-head">
          <h2>{t('searchAndFilter')}</h2>
          <button
            className="tm-canvas-close uk-close-large"
            type="button"
            uk-close=""
            onClick={() => closeModal()}
          ></button>
        </div>

        <div className="login_form">
          <form onSubmit={(e) => e.preventDefault()}>
            <div className="search_wrap">
              <svg
                aria-hidden="true"
                focusable="false"
                data-prefix="fal"
                data-icon="search"
                className="svg-inline--fa fa-search fa-w-16"
                role="img"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 512 512"
              >
                <path
                  fill="currentColor"
                  d="M508.5 481.6l-129-129c-2.3-2.3-5.3-3.5-8.5-3.5h-10.3C395 312 416 262.5 416 208 416 93.1 322.9 0 208 0S0 93.1 0 208s93.1 208 208 208c54.5 0 104-21 141.1-55.2V371c0 3.2 1.3 6.2 3.5 8.5l129 129c4.7 4.7 12.3 4.7 17 0l9.9-9.9c4.7-4.7 4.7-12.3 0-17zM208 384c-97.3 0-176-78.7-176-176S110.7 32 208 32s176 78.7 176-176-78.7 176-176 176z"
                ></path>
              </svg>
              <label>
                <input
                  className="effect-9 search_input"
                  type="text"
                  placeholder={`${t('search')}...`}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </label>
              {!!search?.length && (
                <img
                  src="/assets/times.svg"
                  onClick={() => setSearch("")}
                  alt="clear"
                />
              )}
            </div>

            <div className="range-wrap">
              <div className="range-info">
                <span className="name-range">
                  {t('lengthPalicek')}
                </span>
                <span className="value-range">
                  {stateRange.length.min} - {stateRange.length.max} mm
                </span>
              </div>
              <CustomRangeSlider
                maxValue={rangeNumber.length.max}
                minValue={rangeNumber.length.min}
                value={stateRange.length}
                onChange={(value: RangeValue) => handleChange("length", value)}
              />
            </div>

            <div className="range-wrap">
              <div className="range-info">
                <span className="name-range">
                  {t('weightPalicek')}
                </span>
                <span className="value-range">
                  {stateRange.diameter.min} - {stateRange.diameter.max} mm
                </span>
              </div>
              <CustomRangeSlider
                maxValue={rangeNumber.diameter.max}
                minValue={rangeNumber.diameter.min}
                value={stateRange.diameter}
                onChange={(value: RangeValue) =>
                  handleChange("diameter", value)
                }
              />
            </div>
          </form>

          <button
            type="button"
            className="tm-button tm-black-button uk-width-1-1"
            style={{ marginTop: "30px" }}
            onClick={handleFilter}
          >
            {t('showResults')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ModalFilter;
