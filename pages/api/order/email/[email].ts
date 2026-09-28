import type { NextApiRequest, NextApiResponse } from "next";
import { ordersApi, serializeOrder } from "@/lib/strapiAdmin";
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
    const requestedEmail = String(Array.isArray(email) ? email[0] : email ?? "");

    // Only the logged-in owner of this address may list its order history - and we
    // use their session email, never the URL param, so nobody can page through
    // someone else's orders by editing the address in the URL.
    const sessionUser = await getSessionUser(req);
    if (!sessionUser) {
      return res.status(401).json({ msg: "Not authenticated" });
    }
    if (sessionUser.email !== requestedEmail) {
      return res.status(403).json({ msg: "Forbidden" });
    }

    const orders = await ordersApi.find({
      "filters[email][$eq]": sessionUser.email,
      "sort[0]": "orderDate:asc",
      "pagination[pageSize]": 100,
    });

    return res.status(200).json({
      msg: "Order successfully getting",
      data: orders.map(serializeOrder),
    });
  } catch (err) {
    console.error("Order getting error:", err);
    return res.status(500).json({ msg: "Internal Server Error" });
  }
}