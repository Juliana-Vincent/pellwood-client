import { useEffect, useContext } from "react";
import { DataStateContext } from "@/context/dataStateContext";
import Page from "@/layout/Page";
import Link from "next/link";
import gtag from "@/functions/gtag";
import { AxiosAPI } from "@/restClient";
import localize from "@/data/localize";
import { useTranslation } from "@/hooks/useTranslation";
import type { GetServerSidePropsContext } from "next";
import type { GtagPurchaseEvent } from "@/functions/gtag";

export async function getServerSideProps({ query, locale }: GetServerSidePropsContext) {
  const { lang } = localize(locale);
  if (!query.refId) {
    return {
      redirect: {
        destination: "/not-found",
        permanent: false,
      },
    };
  }

  const res = await AxiosAPI.get(`/payment/status/${query.refId}`);

  const order = res.data?.data?.[0];

  if (!order) {
    return {
      redirect: {
        destination: "/not-found",
        permanent: false,
      },
    };
  }

  // Fire the confirmation email and the purchase conversion event only the first time
  // this order's thank-you page is loaded. This page re-runs on every request
  // (refresh, revisit, bookmark), and without this guard both would fire again
  // every single time.
  const alreadyNotified = !!order.notified;

  if (!alreadyNotified) {
    // Fire and forget - doesn't block the page load. The endpoint itself atomically
    // claims the "notified" flag, so this is also safe against races. Only idOrder is
    // sent: /api/payment/status (above) now returns just the non-PII fields needed for
    // this page, and /api/send/orderInfo re-fetches the full order server-side itself.
    AxiosAPI.post(`/send/orderInfo`, { idOrder: order.idOrder }).catch((err) => {
      console.error("Failed to send order email:", err.message);
    });
  }

  var status = "",
    dataGtag: GtagPurchaseEvent | undefined = undefined;

  if (order.payOnline) {
    status = order.status || "";
    if (!alreadyNotified && status !== "PENDING" && status !== "CANCELLED") {
      dataGtag = gtag(order);
    }
  } else {
    status = "dobirka";
    if (!alreadyNotified) {
      dataGtag = gtag(order);
    }
  }

  return {
    props: {
      status,
      dataGtag: dataGtag || null,
    },
  };
}

interface ThankYouProps {
  status: string;
  dataGtag?: GtagPurchaseEvent | null;
}

const ThankYou = ({ status, dataGtag }: ThankYouProps) => {
  const { dataContextDispatch } = useContext(DataStateContext);
  const { t, lang } = useTranslation();

  useEffect(() => {
    // "basket" + lang / "basketCount" + lang are built dynamically, so they can't be
    // statically narrowed to the DataAction union - same pattern as layout/Canvas.tsx.
    dataContextDispatch({ state: [], type: ("basket" + lang) as "basketcz" | "basketen" });
    dataContextDispatch({ state: 0, type: ("basketCount" + lang) as "basketCountcz" | "basketCounten" });
  }, [status, lang, dataContextDispatch]);

  return (
    <Page className="thank-you-page base-page" purchase={dataGtag}>
      <h1>{t("thankOrder")}</h1>
      <p>{t("thankInfo")}</p>
      {!!status.length && status === "PENDING" && (
        <div className="uk-text-warning">{t("PayStatusWait")}</div>
      )}
      {!!status.length && status === "CANCELLED" && (
        <div className="uk-text-danger">{t("PayStatusError")}</div>
      )}
      {!!status.length && status === "PAID" && (
        <div className="uk-text-success">{t("PayStatusOk")}</div>
      )}
      {!!status.length && status === "dobirka" && (
        <div className="uk-text-success">{t("PayStatusCash")}</div>
      )}

      <Link href="/" className="tm-button tm-black-button">
        {t("backtohp")}
      </Link>
    </Page>
  );
};

export default ThankYou;
