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

  const orderId = String(Array.isArray(id) ? id[0] : id ?? "");

  // An order's id is an unguessable uuid, but "hard to guess" isn't
  // "authenticated" - only the order's own customer may read or remove it.
  const sessionUser = await getSessionUser(req);
  if (!sessionUser) {
    return res.status(401).json({ msg: "Not authenticated" });
  }
  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order || order.email !== sessionUser.email) {
    return res.status(404).json({ msg: "Order not found" });
  }

  switch (method) {
    case "GET":
      try {
        // Retaining an array response to preserve existing UI expectations
        return res.status(200).json([order]);
      } catch (err) {
        console.error("Order GET error:", err);
        return res.status(500).json({ msg: "Internal Server Error" });
      }

    case "DELETE":
      try {
        // deleteMany, and the response hand-shaped, so the body keeps the
        // { acknowledged, deletedCount } form the UI already reads.
        const { count } = await prisma.order.deleteMany({ where: { id: orderId } });
        return res.status(200).json({ acknowledged: true, deletedCount: count });
      } catch (err) {
        console.error("Order DELETE error:", err);
        return res.status(500).json({ msg: "Internal Server Error" });
      }

    default:
      res.setHeader("Allow", ["GET", "DELETE"]);
      return res.status(405).end(`Method ${method} Not Allowed`);
  }
}