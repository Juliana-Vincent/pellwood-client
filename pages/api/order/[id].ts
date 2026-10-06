import type { NextApiRequest, NextApiResponse } from "next";
import { ordersApi, serializeOrder } from "@/lib/strapiAdmin";
import { getSessionUser } from "@/lib/session";
import { sameEmail } from "@/helpers/email";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const {
    query: { id },
    method,
  } = req;

  // GET only. There used to be a DELETE here that let a logged-in customer
  // permanently remove any order of theirs - paid ones included, which are
  // accounting records Comgate and the confirmation emails refer to. Nothing in
  // the site ever called it; it was attack surface with no feature behind it.
  if (method !== "GET") {
    res.setHeader("Allow", ["GET"]);
    return res.status(405).end(`Method ${method} Not Allowed`);
  }

  const orderId = String(Array.isArray(id) ? id[0] : id ?? "");

  try {
    // An order's documentId is unguessable, but "hard to guess" isn't
    // "authenticated" - only the order's own customer may read it.
    const sessionUser = await getSessionUser(req);
    if (!sessionUser) {
      return res.status(401).json({ msg: "Not authenticated" });
    }
    const order = await ordersApi.findOne(orderId);
    if (!order || !sameEmail(order.email, sessionUser.email)) {
      return res.status(404).json({ msg: "Order not found" });
    }

    // Retaining an array response to preserve existing UI expectations
    return res.status(200).json([serializeOrder(order)]);
  } catch (err) {
    console.error("Order GET error:", err);
    return res.status(500).json({ msg: "Internal Server Error" });
  }
}
