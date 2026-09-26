import type { NextApiRequest, NextApiResponse } from "next";
import prisma from "@/lib/db";
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
    // An id is unguessable, but "hard to guess" isn't "authenticated" -
    // only the order's own customer may read it (mirrors api/order/[id].ts).
    const sessionUser = await getSessionUser(req);
    if (!sessionUser) {
      return res.status(401).json({ msg: "Not authenticated" });
    }

    // findMany instead of findUnique to guarantee we return an array,
    // ensuring we don't break existing UI expectations.
    const orderData = await prisma.order.findMany({
      where: {
        id: String(Array.isArray(id) ? id[0] : id ?? ""),
        email: sessionUser.email,
      },
    });

    return res.status(200).json(orderData);
  } catch (err) {
    console.error("Order getting error:", err);
    return res.status(500).json({ msg: "Internal Server Error" });
  }
}