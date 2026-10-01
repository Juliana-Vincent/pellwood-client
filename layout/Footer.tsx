import React, { useState, useEffect } from "react";
import { fetchAPI } from "../lib/strapi";
import BlockContent from "../components/BlockContent";
import { useTranslation } from "../hooks/useTranslation";

export default () => {
  const { t, lang } = useTranslation();
  const [footer, setFooter] = useState<any[]>([]);

  const loadFooter = () => {
    const strapiLocale = lang === "cz" ? "cs" : lang;
    fetchAPI("setting", {
      locale: strapiLocale,
      populate: "*",
    })
      .then((res) => {
        const data = res.data || {};
        setFooter(data.footer || []);
      })
      .catch((err) => {
        console.error("Failed to load footer", err);
      });
  };

  useEffect(() => {
    loadFooter();
  }, [lang]);

    const handleCookies = async (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    const cc = await import("vanilla-cookieconsent");
    cc.showPreferences();
  };

  return (
    <footer>
      <div className="uk-container uk-container-expand uk-height-1-1">
        <div
          className="uk-flex uk-flex-between uk-flex-middle uk-height-1-1 uk-flex-wrap"
          uk-height-match="target: > .footer-item"
          suppressHydrationWarning
        >
          <div className="cart_method_foot uk-flex uk-flex-left">
            <div>
              <img
                src="/assets/mastercard.svg"
                width="100%"
                height="28"
                alt="Mastercard"
              />
            </div>
            <div>
              <img src="/assets/visa.svg" width="100%" height="28" alt="Visa" />
            </div>
          </div>
          {footer?.length > 0 &&
            footer.map((item, index) => (
              <div key={item.id || index} className="footer-item" suppressHydrationWarning>
                <h4 className="footer-item-head">{item.title}</h4>
                <BlockContent blocks={item.content} />
                {index === 2 && (
                  <a onClick={handleCookies} href="/" aria-label="Cookie settings">
                    {t('cookieSettings')}
                  </a>
                )}
              </div>
            ))}
        </div>
      </div>
      <div className="copyright">
        <span>Made in Brno by </span>
        <a href="mailto:danielkokes@gmail.com,dmytro@pechunka.com" aria-label="Contact developers">
          <img
            src="/assets/hardart.svg"
            height="18"
            width="100%"
            alt="Hardart studio"
          />
        </a>
      </div>
    </footer>
  );
};
