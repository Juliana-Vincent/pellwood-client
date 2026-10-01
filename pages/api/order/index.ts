import type { NextApiRequest, NextApiResponse } from "next";
import axios from "axios";
import { createOrderWithUniqueNumber, serializeOrder } from "@/lib/strapiAdmin";
import { computeAuthoritativeOrderTotal } from "@/functions/validateOrder";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { method } = req;

  if (method === "POST") {
    try {
      const {
        note,
        currency,
        user,
        basket,
        payment,
        delivery,
      } = req.body;

      if (payment?.payOnline && (!process.env.PAYED_ID || !process.env.PAYED_PASSWORD)) {
        throw new Error("Payment gateway is not configured (PAYED_ID/PAYED_PASSWORD missing)");
      }

      const { total, deliveryPrice, paymentPrice, payOnline, basket: verifiedBasket } =
        await computeAuthoritativeOrderTotal(basket, delivery, payment, currency, user?.country);

      const created = await createOrderWithUniqueNumber({
        email: user.email ?? "",
        phone: user.phone ?? "",
        name: user.name ?? "",
        surname: user.surname ?? "",
        country: user.country ?? "",
        city: user.city ?? "",
        address: user.address ?? "",
        code: user.code ?? "",
        anotherAddressCheck: Boolean(user.anotherAddressCheck),
        companyDataCheck: Boolean(user.companyDataCheck),
        anotherAdress: user.anotherAdress ?? {},
        companyData: user.companyData ?? {},
        orderDate: new Date().toISOString(),
        currency: currency ?? "",
        note: note ?? "",
        basket: verifiedBasket,
        sum: total,
        // Never from the request body: status is set only by the Comgate-verified
        // webhook in /api/payment.
        status: payOnline ? "PENDING" : "",
        state: "new",
        paymentMethod: payment.value ?? "",
        paymentPrice: String(paymentPrice ?? ""),
        payOnline,
        deliveryMethod: delivery.value ?? "",
        deliveryPrice: String(deliveryPrice ?? ""),
        notified: false,
      });

      const order = serializeOrder(created);

      const host = req.headers["x-forwarded-host"] || req.headers.host;
      const proto = req.headers["x-forwarded-proto"] || "https";
      const localePrefix = currency === "Kč" ? "" : "/en";

      const returnUrl =
        proto + "://" + host + localePrefix + "/thank-you?refId=${refId}&transId=${id}";

      let resDataParse: Record<string, string> = {};

      if (payOnline) {
        if (!process.env.PAYED_ID || !process.env.PAYED_PASSWORD) {
          throw new Error("Payment gateway is not configured (PAYED_ID/PAYED_PASSWORD missing)");
        }
        const paymentData = {
          merchant: process.env.PAYED_ID,
          price: String(Math.round(total * 100)),
          lang: currency === "Kč" ? "cs" : "en",
          curr: currency === "Kč" ? "CZK" : "EUR",
          label: `${user.name}-${user.surname}`,
          refId: String(order.idOrder),
          cat: "PHYSICAL",
          method: "ALL",
          prepareOnly: "true",
          email: user.email,
          secret: process.env.PAYED_PASSWORD,
          url_paid: returnUrl,
          url_cancelled: returnUrl,
          url_pending: returnUrl,
        };

        // Posted as the form body, not the query string, so the merchant secret
        // never ends up in access logs, proxies, or monitoring.
        const params = new URLSearchParams(paymentData);

        const resPayment = await axios.post(
          `https://payments.comgate.cz/v1.0/create`,
          params
        );

        const responseParams = new URLSearchParams(resPayment.data);
        for (const [key, value] of responseParams.entries()) {
          resDataParse[key] = value;
        }
      }

      const zboziConverseBody = {
        PRIVATE_KEY: process.env.ZBOZI_PRIVATE_KEY,
        sandbox: false,
        orderId: order.idOrder,
        email: order.email,
        deliveryType: "PPL",
        // Safely extract price digits even if value is "ZDARMA"
        deliveryPrice: parseInt(String(order.deliveryPrice)) || 0,
        paymentType: order.paymentMethod,
        otherCosts: parseInt(String(order.paymentPrice)) || 0,
        cart: verifiedBasket.map((item: any) => ({
          itemId: item.id,
          productName: `${item.nameProduct}${item.variantName ? " - " + item.variantName : ""}`,
          unitPrice: Number(item.variantPrice) || 0,
          quantity: Number(item.countVariant) || 1,
        })),
      };

      // Fire-and-forget, with a timeout - this is third-party conversion tracking, not
      // part of placing the order, so a slow/unreachable zbozi.cz must never block (or
      // fail) checkout for the customer, who already has a saved order at this point.
      axios
        .post(
          `https://www.zbozi.cz/action/153477/conversion/backend`,
          zboziConverseBody,
          { timeout: 5000 }
        )
        .catch((err) =>
          console.error("Zbozi Conversion ERROR:", err.response?.data?.problemTypes || err.message)
        );

      return res.status(200).json({
        msg: "Order successfully created",
        data: payOnline ? resDataParse : order,
      });
    } catch (err) {
      console.error("Order POST error:", err);
      return res.status(500).json({
        msg: "Internal Server Error",
      });
    }
  }

  // There used to be an unauthenticated PUT here that let anyone flip any order's
  // state (or create junk orders via upsert) by guessing an id - it had no caller
  // anywhere in the client, so it was pure attack surface with no feature behind
  // it. Order status is set exclusively by the Comgate-verified webhook in
  // /api/payment. If an admin-triggered status override is ever needed, it must be
  // built with real admin authentication, not reintroduced here unauthenticated.

  res.setHeader("Allow", ["POST"]);
  return res.status(405).end(`Method ${method} Not Allowed`);
}