import type { NextApiRequest, NextApiResponse } from "next";
import dbConnect from "@/lib/dbConnect";
import Order from "@/models/order.model";
import { getSessionUser } from "@/lib/session";

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

    // A Mongo _id is unguessable, but "hard to guess" isn't "authenticated" -
    // only the order's own customer may read it (mirrors api/order/[id].ts).
    const sessionUser = await getSessionUser(req);
    if (!sessionUser) {
      return res.status(401).json({ msg: "Not authenticated" });
    }

    // Retaining .find() instead of .findById() to guarantee we return an array,
    // ensuring we don't break existing UI expectations.
    const orderData = await Order.find({ _id: id, email: sessionUser.email });

    return res.status(200).json(orderData);
  } catch (err) {
    console.error("Order getting error:", err);
    return res.status(500).json({
      msg: "Internal Server Error", // real error is already logged server-side above
    });
  }
}
