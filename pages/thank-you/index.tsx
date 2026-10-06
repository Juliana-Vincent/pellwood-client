import { useEffect, useContext } from "react";
import { DataStateContext } from "@/context/dataStateContext";
import Page from "@/layout/Page";
import Link from "next/link";
import crypto from "crypto";
import gtag from "@/functions/gtag";
import { ordersApi, serializeOrder } from "@/lib/strapiAdmin";
import { sendOrderConfirmation } from "@/lib/orderEmail";
import { useTranslation } from "@/hooks/useTranslation";
import type { GetServerSidePropsContext } from "next";
import type { GtagPurchaseEvent } from "@/functions/gtag";

const tokenMatches = (provided: unknown, expected: unknown): boolean => {
  const a = Buffer.from(String(provided ?? ""));
  const b = Buffer.from(String(expected ?? ""));
  // timingSafeEqual throws on a length mismatch, so that is checked first.
  return a.length > 0 && a.length === b.length && crypto.timingSafeEqual(a, b);
};

export async function getServerSideProps({ query }: GetServerSidePropsContext) {
  if (!query.refId || !query.t) {
    return { notFound: true };
  }

  const orderNumber = Number(query.refId);
  if (!Number.isInteger(orderNumber)) {
    return { notFound: true };
  }

  // Read Strapi directly. This used to go through GET /api/payment/status/:id over
  // HTTP, which was an unauthenticated endpoint returning an order's line items,
  // quantities, prices and total for any guessed order number - 9 million numbers is
  // not a secret. That route is gone; this page is server-side, so it needs no HTTP
  // hop, and the per-order token below is what actually authorises the view.
  const order = await ordersApi.findFirst({
    "filters[idOrder][$eq]": orderNumber,
  });

  if (!order || !tokenMatches(query.t, order.accessToken)) {
    return { notFound: true };
  }

  const serialized = serializeOrder(order);

  var status = "",
    dataGtag: GtagPurchaseEvent | undefined = undefined;

  if (order.payOnline) {
    status = order.status || "";

    // `notified` is an email flag and was previously used to gate the analytics
    // conversion too. Because Comgate's redirect usually beats its webhook, the
    // first load saw PENDING, the email claimed the flag, and the purchase event
    // was then suppressed on every later load - so GA4 only ever recorded the
    // orders where the webhook happened to win the race. The two now have separate
    // flags, and the conversion fires only once the payment is verified PAID.
    if (status === "PAID" && !order.conversionSent) {
      dataGtag = gtag(serialized);
      await ordersApi.update(order.documentId, { conversionSent: true });
    }
  } else {
    status = "dobirka";

    // Cash on delivery never touches the gateway, so this page is the only place
    // that knows the order was placed. sendOrderConfirmation is idempotent.
    sendOrderConfirmation(orderNumber).catch((err) =>
      console.error("Order confirmation email failed:", err)
    );

    if (!order.conversionSent) {
      dataGtag = gtag(serialized);
      await ordersApi.update(order.documentId, { conversionSent: true });
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
  const { dataContextState, dataContextDispatch } = useContext(DataStateContext);
  const { t, lang } = useTranslation();

  const failed = status === "CANCELLED";
  const pending = status === "PENDING";

  useEffect(() => {
    if (!dataContextState.hydrated) return;
    // A cancelled or failed payment means no order the customer will receive, so
    // their basket must survive it - it used to be wiped here regardless, leaving
    // them to rebuild it from scratch to try again.
    if (failed) return;

    dataContextDispatch({ state: [], type: ("basket" + lang) as "basketcz" | "basketen" });
    dataContextDispatch({ state: 0, type: ("basketCount" + lang) as "basketCountcz" | "basketCounten" });
  }, [dataContextState.hydrated, failed, lang, dataContextDispatch]);

  // Comgate usually sends the customer back before its webhook has told us how the
  // payment ended, so the first view often says PENDING and nothing ever updated
  // it. Look again a few times. A full reload rather than a client re-render: the
  // purchase scripts are only switched on by the cookie-consent scan at page load.
  useEffect(() => {
    if (!pending) return;
    const params = new URLSearchParams(window.location.search);
    const tries = Number(params.get("check") || 0);
    if (tries >= 5) return;
    const timer = setTimeout(() => {
      params.set("check", String(tries + 1));
      window.location.replace(`${window.location.pathname}?${params.toString()}`);
    }, 3000);
    return () => clearTimeout(timer);
  }, [pending]);

  if (failed) {
    return (
      <Page className="thank-you-page base-page" title={t("PayStatusError")} noCrawl>
        <h1>{t("PayStatusError")}</h1>
        <p>{t("paymentFailedInfo")}</p>
        <Link href="/basket" className="tm-button tm-black-button">
          {t("backToBasket")}
        </Link>
      </Page>
    );
  }

  return (
    <Page className="thank-you-page base-page" title={t("thankOrder")} purchase={dataGtag} noCrawl>
      <h1>{t("thankOrder")}</h1>
      {/* "A confirmation has been sent" is only true once the payment is settled -
          the email goes out from the verified webhook, not before. */}
      <p>{pending ? t("paymentPendingInfo") : t("thankInfo")}</p>
      {pending && <div className="uk-text-warning">{t("PayStatusWait")}</div>}
      {status === "PAID" && <div className="uk-text-success">{t("PayStatusOk")}</div>}
      {status === "dobirka" && <div className="uk-text-success">{t("PayStatusCash")}</div>}

      <Link href="/" className="tm-button tm-black-button">
        {t("backtohp")}
      </Link>
    </Page>
  );
};

export default ThankYou;
