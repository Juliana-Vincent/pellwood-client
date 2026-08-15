import type { NextApiRequest, NextApiResponse } from "next";
import dbConnect from "@/lib/dbConnect";
import Order from "@/models/order.model";
import { getSessionUser } from "@/lib/session";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const {
    query: { email },
    method,
  } = req;

  if (method !== "GET") {
    res.setHeader("Allow", ["GET"]);
    return res.status(405).end(`Method ${method} Not Allowed`);
  }

  try {
    await dbConnect();

    // Only the logged-in owner of this address may list its order history - and we
    // use their session email, never the URL param, so nobody can page through
    // someone else's orders by editing the address in the URL.
    const sessionUser = await getSessionUser(req);
    if (!sessionUser) {
      return res.status(401).json({ msg: "Not authenticated" });
    }
    if (sessionUser.email !== email) {
      return res.status(403).json({ msg: "Forbidden" });
    }

    const orderData = await Order.find({ email });

    return res.status(200).json({
      msg: "Order successfully getting",
      data: orderData,
    });
  } catch (err) {
    console.error("Order getting error:", err);
    return res.status(500).json({
      msg: "Internal Server Error", // real error is already logged server-side above
    });
  }
}
