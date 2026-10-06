import React, { useState, useEffect, useContext } from "react";
import Link from "next/link";
import { fetchAPI } from "../lib/strapi";
import { DataStateContext, DataState } from "../context/dataStateContext";
import { useTranslation } from "../hooks/useTranslation";
import Canvas from "./Canvas";
import { useRouter } from "next/router";

interface ArchiveItem {
  title: string;
  slug: string;
}

interface MenuItem {
  title: string;
  slug: string;
}

const AUTH_ENABLED = true;

const Header = ({
  loginUser,
  csHref = "/",
  enHref = "/",
}: {
  loginUser?: boolean;
  csHref?: string;
  enHref?: string;
}) => {
  const router = useRouter();
  const { t, lang } = useTranslation();

  const { dataContextState } = useContext(DataStateContext);
  const [menu, setMenu] = useState<MenuItem[]>([]);
  const [hamburger, setHamburger] = useState<boolean>(false);

  // Close the mobile menu on every navigation. It only closed when the Header
  // remounted, and between pages of the same type - another product, another
  // category, or a language switch - it doesn't, so the menu stayed open over the
  // page that had just loaded underneath it.
  useEffect(() => {
    const close = () => setHamburger(false);
    router.events.on("routeChangeStart", close);
    return () => router.events.off("routeChangeStart", close);
  }, [router.events]);
  const [mounted, setMounted] = useState<boolean>(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // UIkit flips aria-expanded on the toggle itself, but React owns that attribute
  // and resets it to the rendered value on the next re-render - which includes the
  // re-render caused by adding an item, the very moment the panel opens. Following
  // the off-canvas's own events keeps the two in agreement.
  const [basketOpen, setBasketOpen] = useState<boolean>(false);
  useEffect(() => {
    const panel = document.getElementById("offcanvas-flip");
    if (!panel) return;
    const open = () => setBasketOpen(true);
    const close = () => setBasketOpen(false);
    panel.addEventListener("shown", open);
    panel.addEventListener("hidden", close);
    return () => {
      panel.removeEventListener("shown", open);
      panel.removeEventListener("hidden", close);
    };
  }, [mounted]);

  useEffect(() => {
    let isSubscribed = true;
    const strapiLocale = lang === "cz" ? "cs" : lang;

    fetchAPI<ArchiveItem[]>("archives", {
      locale: strapiLocale,
      sort: ["sort:asc"],
    })
      .then((res) => {
        if (!isSubscribed) return;
        const formatted: MenuItem[] = (res.data || []).map((item) => ({
          title: item.title,
          slug: item.slug,
        }));
        setMenu(formatted);
      })
      .catch((err: Error) => {
        console.error("Failed to load header menu", err);
      });

    return () => {
      isSubscribed = false;
    };
  }, [lang]);

  const countKey = `basketCount${lang}` as keyof DataState;
  const basketCount = (dataContextState?.[countKey] as number) || 0;

  const isLoggedIn = !!(dataContextState?.user as any)?.email;

  const currentPath = router.asPath.replace(/\?$/, "");

  const renderLanguageOptions = () => (
    <ul>
      <li className={lang === "cz" ? "menu_active" : undefined}>
        <Link href={csHref} locale="cs">cs</Link>
      </li>
      <li className={lang === "en" ? "menu_active" : undefined}>
        <Link href={enHref} locale="en">en</Link>
      </li>
    </ul>
  );

  return (
    <>
      <Canvas />
      <header>
        <div className="uk-container uk-container-expand uk-height-1-1">
          <div className="uk-flex uk-flex-between uk-flex-middle uk-height-1-1">
            
            <Link href="/" className="logo-wrap uk-width-auto">
              <img
                src="/assets/logo.svg"
                width="200"
                height="100%"
                alt="Pellwood"
              />
            </Link>

            <div className="uk-text-right uk-width-expand uk-hidden@m">
              <button
                className={`hamburger hamburger--spin ${hamburger ? "is-active" : ""}`}
                onClick={() => setHamburger(!hamburger)}
                type="button"
                aria-label={t('menu')}
                aria-expanded={hamburger}
              >
                <span className="hamburger-box">
                  <span className="hamburger-inner"></span>
                </span>
              </button>
            </div>

            <div className={`top-nav uk-width-expand ${hamburger ? "menu-active" : ""}`}>
              <nav>
                <ul>
                  <li className={router.pathname.includes("/produkty") ? "active-menu-top" : ""}>
                    <Link href="/produkty">
                      {t('products')}
                    </Link>
                  </li>
                  {menu.map((item) => (
                    <li
                      key={item.slug}
                      className={
                        router.asPath.includes(item.slug) ? "active-menu-top" : ""
                      }
                    >
                      <Link href={`/kategorie/${item.slug}`}>
                        {item.title}
                      </Link>
                    </li>
                  ))}
                </ul>
              </nav>
              
              <div className="lang-nav uk-hidden@m">
                <nav>{renderLanguageOptions()}</nav>
              </div>
            </div>

            <div className="uk-flex function-button-wrap uk-width-auto">
              <div className="lang-nav uk-visible@m">
                <nav>{renderLanguageOptions()}</nav>
              </div>

              <div className="user-area">
                <div className="login">
                  {AUTH_ENABLED && mounted && (
                    isLoggedIn ? (
                      <Link href="/user" className="account-link">
                        {t("account")}
                      </Link>
                    ) : (
                      <button
                        type="button"
                        className="account-link uk-button uk-button-link"
                        uk-toggle="target: #modal-login"
                      >
                        {t("login")}
                      </button>
                    )
                  )}
                  {mounted && (
                    <button
                      type="button"
                      className="basket_count uk-button uk-button-link"
                      uk-toggle="target: #offcanvas-flip"
                      aria-expanded={basketOpen}
                      aria-label={`${t('openBasket')} (${basketCount})`}
                    >
                      {basketCount}
                    </button>
                  )}
                </div>
              </div>
            </div>

          </div>
        </div>
      </header>
    </>
  );
};

export default Header;
