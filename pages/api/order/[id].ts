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

  await dbConnect();

  // An order's _id is an unguessable Mongo ObjectId, but "hard to guess" isn't
  // "authenticated" - only the order's own customer may read or remove it.
  const sessionUser = await getSessionUser(req);
  if (!sessionUser) {
    return res.status(401).json({ msg: "Not authenticated" });
  }
  const order = await Order.findOne({ _id: id });
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
        return res.status(500).json({
          msg: "Internal Server Error", // real error is already logged server-side above
        });
      }

    case "DELETE":
      try {
        const result = await Order.deleteOne({ _id: id });
        return res.status(200).json(result);
      } catch (err) {
        console.error("Order DELETE error:", err);
        return res.status(500).json({
          msg: "Internal Server Error", // real error is already logged server-side above
        });
      }

    default:
      res.setHeader("Allow", ["GET", "DELETE"]);
      return res.status(405).end(`Method ${method} Not Allowed`);
  }
}
