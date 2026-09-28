import type { NextApiRequest, NextApiResponse } from "next";
import { ordersApi } from "@/lib/strapiAdmin";

const PUBLIC_FIELDS = [
  "idOrder",
  "notified",
  "payOnline",
  "status",
  "currency",
  "deliveryPrice",
  "basket",
] as const;

function publicOrderView(order: any) {
  const view: Record<string, any> = {};
  for (const field of PUBLIC_FIELDS) view[field] = order[field];
  view.sum = order.sum === null || order.sum === undefined ? "" : String(order.sum);
  return view;
}

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
    const orderNumber = Number(Array.isArray(id) ? id[0] : id);

    if (!Number.isInteger(orderNumber)) {
      return res.status(200).json({
        msg: "Order status successfully retrieved",
        data: [],
      });
    }

    const rows = await ordersApi.find({
      "filters[idOrder][$eq]": orderNumber,
    });

    return res.status(200).json({
      msg: "Order status successfully retrieved",
      data: rows.map(publicOrderView),
    });
  } catch (err) {
    console.error("Status GET error:", err);
    return res.status(500).json({ msg: "Internal Server Error" });
  }
}