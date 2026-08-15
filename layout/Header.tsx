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

// Accounts (login/register/account page) aren't a requested feature yet - the code
// (Login, ForgotPassword, ResetPassword, /user, the auth API routes) is intentionally
// left in place for whenever that's greenlit, just not linked to from anywhere on the
// site. Flip this back on to re-expose the header's login/account entry point.
const AUTH_ENABLED = false;

const Header = ({ loginUser }: { loginUser?: boolean }) => {
  const router = useRouter();
  const { t, lang } = useTranslation();

  const { dataContextState } = useContext(DataStateContext);
  const [menu, setMenu] = useState<MenuItem[]>([]);
  const [hamburger, setHamburger] = useState<boolean>(false);
  const [mounted, setMounted] = useState<boolean>(false);

  useEffect(() => {
    setMounted(true);
  }, []);

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

  // Derived state directly from context (no need for a redundant useState/useEffect sync)
  const countKey = `basketCount${lang}` as keyof DataState;
  const basketCount = (dataContextState?.[countKey] as number) || 0;

  // Derived directly from context (not the loginUser prop, which is only ever set
  // true on mount and never reset on logout) so this never goes stale after the
  // customer logs in or out.
  const isLoggedIn = !!(dataContextState?.user as any)?.email;

  // router.asPath can render as a bare trailing "?" with no actual query on some
  // passes (confirmed via a live hydration-mismatch diff: SSR gives "/", the client
  // re-render gives "/?") - normalize that away so the Link's href always agrees
  // between server and client instead of triggering a hydration mismatch here on
  // every single page.
  const currentPath = router.asPath.replace(/\?$/, "");

  // Extracted Language Nav to prevent duplicate JSX code block
  const renderLanguageOptions = () => (
    <ul>
      <li className={lang === "cz" ? "menu_active" : undefined}>
        <Link href={currentPath} locale="cs">
          cs
        </Link>
      </li>
      <li className={lang === "en" ? "menu_active" : undefined}>
        <Link href={currentPath} locale="en">
          en
        </Link>
      </li>
      {/* If German (de) becomes active, it can be seamlessly added here */}
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
                aria-label="Toggle Menu"
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
                    <Link href="/produkty?size=6&category=all">
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
                      aria-expanded={false}
                      aria-label="Open basket"
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
