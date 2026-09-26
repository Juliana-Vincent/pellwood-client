import type { NextApiRequest, NextApiResponse } from "next";
import axios from "axios";
import prisma from "@/lib/db";
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

      const { total, deliveryPrice, paymentPrice, payOnline } =
        await computeAuthoritativeOrderTotal(basket, delivery, payment, currency);

      const order = await prisma.order.create({
        data: {
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
          currency: currency ?? "",
          note: note ?? "",
          basket,
          sum: total, // Decimal column, accepts a JS number directly
          status: "",
          state: "new",
          paymentMethod: payment.value ?? "",
          paymentPrice: String(paymentPrice ?? ""),
          payOnline,
          deliveryMethod: delivery.value ?? "",
          deliveryPrice: String(deliveryPrice ?? ""),
        },
      });

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
          cat: "DIGITAL",
          method: "ALL",
          prepareOnly: "true",
          email: user.email,
          secret: process.env.PAYED_PASSWORD,
        };

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
        cart: basket.map((item: any) => ({
          itemId: item.id,
          productName: `${item.nameProduct}${item.variantName ? " - " + item.variantName : ""}`,
          unitPrice: Number(item.variantPrice) || 0,
          quantity: Number(item.countVariant) || 1,
        })),
      };

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

  res.setHeader("Allow", ["POST"]);
  return res.status(405).end(`Method ${method} Not Allowed`);
}