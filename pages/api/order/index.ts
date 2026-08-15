import type { NextApiRequest, NextApiResponse } from "next";
import mongoose from "mongoose";
import axios from "axios";
import dbConnect from "@/lib/dbConnect";
import Order from "@/models/order.model";
import { computeAuthoritativeOrderTotal } from "@/functions/validateOrder";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { method } = req;

  await dbConnect();

  if (method === "POST") {
    try {
      const {
        note,
        currency,
        user,
        basket,
        payment,
        delivery,
        status,
      } = req.body;

      // Recompute the total server-side from real Strapi prices and the known
      // delivery/payment options instead of trusting the client-submitted sum -
      // that number is what gets charged via Comgate below.
      const { total, deliveryPrice, paymentPrice, payOnline } =
        await computeAuthoritativeOrderTotal(basket, delivery, payment, currency);

      const orderBase = {
        _id: new mongoose.Types.ObjectId(),
        email: user.email,
        phone: user.phone,
        name: user.name,
        surname: user.surname,
        country: user.country,
        city: user.city,
        address: user.address,
        code: user.code,
        anotherAdress: user.anotherAdress,
        companyData: user.companyData,
        anotherAddressCheck: user.anotherAddressCheck,
        companyDataCheck: user.companyDataCheck,
        currency,
        note,
        basket,
        sum: total,
        status,
        state: "new",
        paymentMethod: payment.value,
        paymentPrice,
        payOnline,
        deliveryMethod: delivery.value,
        deliveryPrice,
      };

      // idOrder doubles as the Comgate refId and the public order-lookup key, so it
      // must be unique. It's just a random 6-digit number, so collisions are
      // expected at volume - the DB's unique index is what actually enforces
      // uniqueness (checking first, then inserting, would still race under
      // concurrent requests), and we retry with a fresh number on conflict.
      let resOrder;
      for (let attempt = 0; ; attempt++) {
        try {
          resOrder = await Order.create({
            ...orderBase,
            idOrder: Math.floor(Math.random() * 1000000),
          });
          break;
        } catch (err: any) {
          if (err?.code === 11000 && attempt < 4) continue;
          throw err;
        }
      }
      const order = resOrder;

      let resDataParse: Record<string, string> = {};

      if (payOnline) {
        if (!process.env.PAYED_ID || !process.env.PAYED_PASSWORD) {
          throw new Error("Payment gateway is not configured (PAYED_ID/PAYED_PASSWORD missing)");
        }
        const paymentData = {
          merchant: process.env.PAYED_ID,
          // Math.round, not Math.floor: floating-point multiplication can land a
          // hair under the true value (19.99 * 100 === 1998.9999999999998), which
          // floor would silently undercharge by a cent instead of rounding back up.
          price: String(Math.round(total * 100)),
          lang: currency === "Kč" ? "cs" : "en",
          curr: currency === "Kč" ? "CZK" : "EUR",
          label: `${user.name}-${user.surname}`,
          refId: String(order.idOrder),
          cat: "DIGITAL",
          method: "ALL",
          prepareOnly: "true",
          email: user.email,
          secret: process.env.PAYED_PASSWORD,
        };

        // Leverage native URLSearchParams instead of manual loop and encodeURIComponent.
        // Posted as the form body (not the query string) so the merchant secret never
        // ends up in access logs, proxies, or monitoring - axios sets the
        // application/x-www-form-urlencoded content-type automatically for
        // URLSearchParams bodies.
        const params = new URLSearchParams(paymentData);

        const resPayment = await axios.post(
          `https://payments.comgate.cz/v1.0/create`,
          params
        );

        // Native parsing of Comgate url-encoded response
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
        cart: basket.map((item: any) => ({
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
        data: payOnline ? resDataParse : resOrder,
      });
    } catch (err) {
      console.error("Order POST error:", err);
      return res.status(500).json({
        msg: "Internal Server Error", // real error is already logged server-side above
      });
    }
  }

  // There used to be an unauthenticated PUT here that let anyone flip any order's
  // state (or create junk orders via upsert) by guessing a Mongo _id - it had no
  // caller anywhere in the client, so it was pure attack surface with no feature
  // behind it. Order status is set exclusively by the Comgate-verified webhook in
  // /api/payment. If an admin-triggered status override is ever needed, it must be
  // built with real admin authentication, not reintroduced here unauthenticated.

  res.setHeader("Allow", ["POST"]);
  return res.status(405).end(`Method ${method} Not Allowed`);
}
