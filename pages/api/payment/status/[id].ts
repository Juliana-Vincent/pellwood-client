import type { NextApiRequest, NextApiResponse } from "next";
import prisma from "@/lib/db";

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

    const orderData = await prisma.order.findMany({
      where: { idOrder: orderNumber },
      select: {
        idOrder: true,
        notified: true,
        payOnline: true,
        status: true,
        sum: true,
        currency: true,
        deliveryPrice: true,
        basket: true,
      },
    });

    return res.status(200).json({
      msg: "Order status successfully retrieved",
      data: orderData,
    });
  } catch (err) {
    console.error("Status GET error:", err);
    return res.status(500).json({
      msg: "Internal Server Error",
    });
  }
}