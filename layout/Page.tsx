import { useState, useEffect, useContext, ReactNode } from "react";
import Head from "next/head";
import { useRouter } from "next/router";
import { DataStateContext } from "../context/dataStateContext";
import Header from "./Header";
import Footer from "./Footer";
import dynamic from "next/dynamic";
const Login = dynamic(() => import("../components/Login"), { ssr: false });
const ForgotPassword = dynamic(() => import("../components/ForgotPassword"), {
  ssr: false,
});
const ResetPassword = dynamic(() => import("../components/ResetPassword"), {
  ssr: false,
});
const CookieConsent = dynamic(() => import("../components/CookieConsent"), {
  ssr: false,
});
import { modal } from "uikit";
import Script from "next/script";
import type { PageProps } from "@/types/shop";

export const SITE_URL =
  process.env.NODE_ENV === "development"
    ? "http://localhost:3001"
    : "https://pellwood.com";
// Unset until a GA4 property exists - the analytics <Script> tags below are only
// rendered when this is present, instead of shipping a broken/empty gtag call.
const GA_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;
const defaultTitle = "PELLWOOD";
const defaultDescription = "Paličky";
const defaultImage = `${SITE_URL}/assets/logo.svg`;
const defaultSep = " | ";

const Page = ({
  children,
  id,
  className,
  title,
  description,
  image,
  twitter,
  contentType,
  published,
  category,
  updated,
  noCrawl,
  tags,
  purchase = false,
}: PageProps) => {
  const router = useRouter();
  const theTitle = title
    ? (title + defaultSep + defaultTitle).substring(0, 60)
    : defaultTitle;
  const theDescription = description
    ? description.substring(0, 155)
    : defaultDescription;
  const theImage = image ? image : defaultImage;
  const canonical =
    router.locale === "en"
      ? SITE_URL + "/" + router.locale + router.asPath.split("?")[0]
      : SITE_URL + router.asPath.split("?")[0];

  // router.asPath is locale-agnostic under Pages Router i18n (never carries the
  // /en prefix itself, same as the canonical logic above relies on), so both
  // language variants of the current page can be built from it directly.
  const pathNoQuery = router.asPath.split("?")[0];
  const csUrl = `${SITE_URL}${pathNoQuery}`;
  const enUrl = `${SITE_URL}/en${pathNoQuery === "/" ? "" : pathNoQuery}`;

  const { dataContextState } = useContext(DataStateContext);
  const [loginUser, setLoginUser] = useState(false);

  useEffect(() => {
    if (dataContextState.user) {
      setLoginUser(true);
    }
    if (router.query?.email) {
      modal("#reset-password").show();
    }
    // router.query is often still {} on the very first render (the Pages Router
    // fills it in shortly after for dynamic/client-navigated routes), so an empty
    // dep array could miss a ?email= that arrives a tick later and never open the
    // reset-password modal. router.query.email specifically (not the whole query
    // object, which is a new reference every render) is what the effect reads.
  }, [dataContextState.user, router.query?.email]);

  return (
    <>
      <Head>
        <meta charSet="utf-8" />
        <link rel="icon" href="/favicon/favicon.ico" />

        <link
          rel="apple-touch-icon"
          sizes="180x180"
          href="/favicon/apple-touch-icon.png"
        />
        <link
          rel="icon"
          type="image/png"
          sizes="32x32"
          href="/favicon/favicon-32x32.png"
        />
        <link
          rel="icon"
          type="image/png"
          sizes="16x16"
          href="/favicon/favicon-16x16.png"
        />
        <link rel="manifest" href="/favicon/manifest.json" />
        <link
          rel="mask-icon"
          href="/favicon/safari-pinned-tab.svg"
          color="#5bbad5"
        />

        {/*<link rel="stylesheet preload prefetch" href="/fonts.css" as="style" type="text/css" crossOrigin="anonymous" />*/}
        <meta name="msapplication-TileColor" content="#ffffff" />
        <meta name="theme-color" content="#232323" />
        <meta
          name="google-site-verification"
          content="P5i8IZ7hI1tHTStpXE_BlzfEggYY31nJUUiNZX3CN-8"
        />

        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>{theTitle}</title>
        <link rel="canonical" href={canonical} />
        <link rel="alternate" hrefLang="cs" href={csUrl} />
        <link rel="alternate" hrefLang="en" href={enUrl} />
        <link rel="alternate" hrefLang="x-default" href={csUrl} />
        <meta itemProp="name" content={theTitle} />
        <meta itemProp="description" content={theDescription} />
        <meta itemProp="image" content={theImage} />
        <meta name="description" content={theDescription} />
        {/*<meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:site" content={global.defaultTwitter} />
        <meta name="twitter:title" content={theTitle} />
        <meta name="twitter:description" content={theDescription} />
        <meta name="twitter:creator" content={twitter || global.defaultTwitter} />
        <meta name="twitter:image:src" content={theImage} />*/}
        <meta property="og:title" content={theTitle} />
        <meta property="og:type" content={contentType || "website"} />
        <meta
          property="og:url"
          content={SITE_URL + router.asPath.split("?")[0]}
        />
        <meta property="og:image" content={theImage} />
        <meta property="og:description" content={theDescription} />
        <meta property="og:site_name" content={defaultTitle} />

        {published && (
          <meta name="article:published_time" content={published} />
        )}
        {category && <meta name="article:section" content={category} />}
        {updated && <meta name="article:modified_time" content={updated} />}
        {noCrawl && <meta name="robots" content="noindex, nofollow" />}
        {tags && <meta name="article:tag" content={tags} />}
      </Head>
      {GA_MEASUREMENT_ID && (
        <>
          <Script
            strategy="afterInteractive"
            type="text/plain"
            data-category="analytics"
            src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`}
          ></Script>
          <Script
            strategy="afterInteractive"
            id="google-analytics"
            type="text/plain"
            data-category="analytics"
            dangerouslySetInnerHTML={{
              __html: `window.dataLayer = window.dataLayer || [];
      function gtag(){dataLayer.push(arguments);}
      gtag('js', new Date());
      gtag('config', '${GA_MEASUREMENT_ID}');`,
            }}
          />
        </>
      )}
      <Script strategy="lazyOnload" src="https://c.seznam.cz/js/rc.js"></Script>
      {purchase && GA_MEASUREMENT_ID && (
        <Script
          strategy="afterInteractive"
          id="google-analytics-purchase"
          type="text/plain"
          data-category="analytics"
          dangerouslySetInnerHTML={{
            __html: `gtag('event', 'purchase', ${JSON.stringify(purchase)})`,
          }}
        />
      )}

      {purchase && (
        <Script
          strategy="lazyOnload"
          id="seznam-conversion"
          dangerouslySetInnerHTML={{
            __html: `
        var conversionConf = {
          zboziId: 153477,
          orderId: ${purchase.transaction_id},
          zboziType: "standard",
          consent: 1,
        };
        if (window.rc && window.rc.conversionHit) {
          window.rc.conversionHit(conversionConf);
        }`,
          }}
        />
      )}
      <Header loginUser={loginUser} />
      <main id={id} className={className}>
        {children}
      </main>
      <Footer />
      <ForgotPassword />
      <ResetPassword />
      <Login setLoginUser={setLoginUser} />
      <CookieConsent />
    </>
  );
};

export default Page;
