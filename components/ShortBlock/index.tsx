import { useState, useEffect } from "react";
import Cart from "../Cart";
import { useTranslation } from "@/hooks/useTranslation";
import type { Product } from "@/types/product";

interface ShortBlockProps {
  data?: Product[];
  lang: string;
  currency: string;
}

const ShortBlock = ({ data, lang, currency }: ShortBlockProps) => {
  const { t } = useTranslation();
  const [desktop, setDesktop] = useState<boolean>(true);

  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (typeof window !== "undefined") {
      setDesktop(window.innerWidth > 960);
    }
  }, []);

  return (
    <section className="grey section_base slider-card">
      <div className="uk-container uk-container-expand">
        <div
          className="uk-grid uk-child-width-1-1 uk-grid-stack"
          uk-grid=""
          suppressHydrationWarning
        >
          <div suppressHydrationWarning>
            <h2
              className="section_head"
              uk-scrollspy="cls: uk-animation-slide-top-small; delay: 500"
              suppressHydrationWarning
            >
              {t("interestedproducts")}
            </h2>
          </div>
        </div>
        {(!mounted || desktop) && (
          <div
            className="uk-child-width-1-1 uk-child-width-1-2@s uk-child-width-1-3@m uk-grid uk-grid-stack"
            uk-grid=""
            suppressHydrationWarning
          >
            {(data || []).map((item, index) => (
              <Cart
                key={item.id || index}
                item={item}
                lang={lang}
                currency={currency}
                block={true}
              />
            ))}
          </div>
        )}
        {mounted && !desktop && (
          <div>
            <div
              className="uk-position-relative uk-visible-toggle uk-light"
              tabIndex={-1}
              uk-slider="center: true;"
            >
              <ul
                className="uk-slider-items uk-grid uk-child-width-1-1 uk-child-width-1-2@s uk-child-width-1-3@m"
                uk-scrollspy="target: > li > a; cls: uk-animation-slide-top-small; delay: 500"
                suppressHydrationWarning
              >
                {(data || []).map((item, index) => (
                  <Cart
                    key={item.id || index}
                    item={item}
                    lang={lang}
                    currency={currency}
                    block={false}
                  />
                ))}
              </ul>
              <ul className="uk-slider-nav uk-dotnav uk-flex-center uk-margin"></ul>
            </div>
          </div>
        )}
      </div>
    </section>
  );
};

export default ShortBlock;
