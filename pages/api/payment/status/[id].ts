import type { NextApiRequest, NextApiResponse } from "next";
import dbConnect from "@/lib/dbConnect";
import Order from "@/models/order.model";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const {
    query: { id },
    method,
  } = req;

  if (method !== "GET") {
    res.setHeader("Allow", ["GET"]);
    return res.status(405).end(`Method ${method} Not Allowed`);
  }

  try {
    await dbConnect();

    // idOrder is a public, guessable 6-digit lookup key (it's literally in the
    // /thank-you?refId= URL) used by guest customers who have no session yet
    // right after checkout - so this endpoint has to stay unauthenticated, but
    // it must never leak PII to whoever guesses/enumerates an idOrder. Project
    // down to only the fields the thank-you page and its purchase-conversion
    // event actually use - never name/address/phone/email/company data.
    const orderData = await Order.find(
      { idOrder: id },
      "idOrder notified payOnline status sum currency deliveryPrice basket"
    );

    return res.status(200).json({
      msg: "Order status successfully retrieved",
      data: orderData,
    });
  } catch (err) {
    console.error("Status GET error:", err);
    return res.status(500).json({
      msg: "Internal Server Error", // real error is already logged server-side above
    });
  }
}
