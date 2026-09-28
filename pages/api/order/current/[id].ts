import type { NextApiRequest, NextApiResponse } from "next";
import { ordersApi, serializeOrder } from "@/lib/strapiAdmin";
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
    const sessionUser = await getSessionUser(req);
    if (!sessionUser) {
      return res.status(401).json({ msg: "Not authenticated" });
    }

    const orderId = String(Array.isArray(id) ? id[0] : id ?? "");
    const order = await ordersApi.findOne(orderId);

    if (!order || order.email !== sessionUser.email) {
      return res.status(200).json([]);
    }

    return res.status(200).json([serializeOrder(order)]);
  } catch (err) {
    console.error("Order getting error:", err);
    return res.status(500).json({ msg: "Internal Server Error" });
  }
}