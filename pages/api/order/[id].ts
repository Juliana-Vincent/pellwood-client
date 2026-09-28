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

  const orderId = String(Array.isArray(id) ? id[0] : id ?? "");

  // An order's documentId is unguessable, but "hard to guess" isn't
  // "authenticated" - only the order's own customer may read or remove it.
  const sessionUser = await getSessionUser(req);
  if (!sessionUser) {
    return res.status(401).json({ msg: "Not authenticated" });
  }
  const order = await ordersApi.findOne(orderId);
  if (!order || order.email !== sessionUser.email) {
    return res.status(404).json({ msg: "Order not found" });
  }

  switch (method) {
    case "GET":
      try {
        // Retaining an array response to preserve existing UI expectations
        return res.status(200).json([serializeOrder(order)]);
      } catch (err) {
        console.error("Order GET error:", err);
        return res.status(500).json({ msg: "Internal Server Error" });
      }

    case "DELETE":
      try {
        await ordersApi.remove(orderId);
        return res.status(200).json({ acknowledged: true, deletedCount: 1 });
      } catch (err) {
        console.error("Order DELETE error:", err);
        return res.status(500).json({ msg: "Internal Server Error" });
      }

    default:
      res.setHeader("Allow", ["GET", "DELETE"]);
      return res.status(405).end(`Method ${method} Not Allowed`);
  }
}