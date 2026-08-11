import type { NextApiRequest, NextApiResponse } from "next";
import axios from "axios";
import dbConnect from "@/lib/dbConnect";
import Order from "@/models/order.model";

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
    await dbConnect();

    const { refId, transId } = req.body;

    if (!refId || !transId) {
      return res.status(400).json({ msg: "Missing refId/transId" });
    }

    if (!process.env.PAYED_ID || !process.env.PAYED_PASSWORD) {
      throw new Error("Payment gateway is not configured (PAYED_ID/PAYED_PASSWORD missing)");
    }

    // Comgate's webhook body is an unauthenticated POST from the public internet - a
    // client-forgeable request. Instead of trusting req.body.status directly (which
    // would let anyone mark any order "PAID" by guessing/brute-forcing its refId),
    // re-verify the payment status against Comgate's own status API using our
    // merchant secret, and only apply what Comgate itself reports.
    const statusParams = new URLSearchParams({
      merchant: process.env.PAYED_ID,
      secret: process.env.PAYED_PASSWORD,
      transId: String(transId),
    });

    const statusRes = await axios.post(
      `https://payments.comgate.cz/v1.0/status?${statusParams.toString()}`
    );
    const verified = new URLSearchParams(statusRes.data);
    const verifiedStatus = verified.get("status");
    const verifiedRefId = verified.get("refId");

    if (!verifiedStatus || verifiedRefId !== String(refId)) {
      return res.status(400).json({ msg: "Could not verify payment with Comgate" });
    }

    await Order.findOneAndUpdate(
      { idOrder: refId },
      { status: verifiedStatus }
    );

    return res.status(200).json({
      msg: "Payment successfully processed",
      data: {},
    });
  } catch (err) {
    console.error("Payment update POST error:", err);
    return res.status(500).json({
      msg: err instanceof Error ? err.message : "Internal Server Error",
    });
  }
}
