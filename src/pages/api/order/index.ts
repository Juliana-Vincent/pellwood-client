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

      const order = {
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
        idOrder: Math.floor(Math.random() * 1000000),
        status,
        state: "new",
        paymentMethod: payment.value,
        paymentPrice,
        payOnline,
        deliveryMethod: delivery.value,
        deliveryPrice,
      };

      let resDataParse: Record<string, string> = {};

      if (payOnline) {
        if (!process.env.PAYED_ID || !process.env.PAYED_PASSWORD) {
          throw new Error("Payment gateway is not configured (PAYED_ID/PAYED_PASSWORD missing)");
        }
        const paymentData = {
          merchant: process.env.PAYED_ID,
          price: String(Math.floor(total * 100)),
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

        // Leverage native URLSearchParams instead of manual loop and encodeURIComponent
        const params = new URLSearchParams(paymentData);

        const resPayment = await axios.post(
          `https://payments.comgate.cz/v1.0/create?${params.toString()}`
        );

        // Native parsing of Comgate url-encoded response
        const responseParams = new URLSearchParams(resPayment.data);
        for (const [key, value] of responseParams.entries()) {
          resDataParse[key] = value;
        }
      }

      const resOrder = await Order.create(order);

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

      await axios
        .post(
          `https://www.zbozi.cz/action/153477/conversion/backend`,
          zboziConverseBody
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
        msg: err instanceof Error ? err.message : "Internal Server Error",
      });
    }
  }

  if (method === "PUT") {
    try {
      const { _id, state } = req.body;
      const order = await Order.updateOne(
        { _id },
        { state },
        { upsert: true }
      );

      return res.status(200).json(order);
    } catch (err) {
      console.error("Order PUT error:", err);
      return res.status(500).json({
        msg: err instanceof Error ? err.message : "Internal Server Error",
      });
    }
  }

  res.setHeader("Allow", ["POST", "PUT"]);
  return res.status(405).end(`Method ${method} Not Allowed`);
}
