import type { NextApiRequest, NextApiResponse } from "next";
import axios from "axios";
import prisma from "@/lib/db";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { method } = req;

  if (method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).end(`Method ${method} Not Allowed`);
  }

  try {
    const { refId, transId } = req.body;

    if (!refId || !transId) {
      return res.status(400).json({ msg: "Missing refId/transId" });
    }

    const orderNumber = Number(refId);
    if (!Number.isInteger(orderNumber)) {
      return res.status(400).json({ msg: "Invalid refId" });
    }

    if (!process.env.PAYED_ID || !process.env.PAYED_PASSWORD) {
      throw new Error("Payment gateway is not configured (PAYED_ID/PAYED_PASSWORD missing)");
    }

    const statusParams = new URLSearchParams({
      merchant: process.env.PAYED_ID,
      secret: process.env.PAYED_PASSWORD,
      transId: String(transId),
    });

    const statusRes = await axios.post(
      `https://payments.comgate.cz/v1.0/status`,
      statusParams
    );
    const verified = new URLSearchParams(statusRes.data);
    const verifiedStatus = verified.get("status");
    const verifiedRefId = verified.get("refId");

    if (!verifiedStatus || verifiedRefId !== String(refId)) {
      return res.status(400).json({ msg: "Could not verify payment with Comgate" });
    }

    const { count } = await prisma.order.updateMany({
      where: { idOrder: orderNumber },
      data: { status: verifiedStatus },
    });

    if (count === 0) {
      console.error(`Payment verified for unknown order idOrder=${orderNumber}`);
      return res.status(404).json({ msg: "Order not found" });
    }

    return res.status(200).json({
      msg: "Payment successfully processed",
      data: {},
    });
  } catch (err) {
    console.error("Payment update POST error:", err);
    return res.status(500).json({
      msg: "Internal Server Error", 
    });
  }
}