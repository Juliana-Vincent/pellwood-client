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

  useEffect(() => {
    if (!dataContextState.hydrated) return;

    dataContextDispatch({ state: [], type: ("basket" + lang) as "basketcz" | "basketen" });
    dataContextDispatch({ state: 0, type: ("basketCount" + lang) as "basketCountcz" | "basketCounten" });
  }, [dataContextState.hydrated, status, lang, dataContextDispatch]);

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
