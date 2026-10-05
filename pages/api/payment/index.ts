import type { NextApiRequest, NextApiResponse } from "next";
import axios from "axios";
import { ordersApi } from "@/lib/strapiAdmin";
import { sendOrderConfirmation } from "@/lib/orderEmail";

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
      `https://payments.comgate.cz/v1.0/status`,
      statusParams
    );
    const verified = new URLSearchParams(statusRes.data);
    const verifiedStatus = verified.get("status");
    const verifiedRefId = verified.get("refId");

    if (!verifiedStatus || verifiedRefId !== String(refId)) {
      return res.status(400).json({ msg: "Could not verify payment with Comgate" });
    }

    const order = await ordersApi.findFirst({
      "filters[idOrder][$eq]": orderNumber,
    });

    if (!order) {
      // Comgate verified a payment for an order we don't have. Never silent - this
      // means money moved against a record that's missing.
      console.error(`Payment verified for unknown order idOrder=${orderNumber}`);
      return res.status(404).json({ msg: "Order not found" });
    }

    // Comgate retries on failure, so this must stay idempotent - writing the same
    // verified status twice is harmless.
    await ordersApi.update(order.documentId, { status: verifiedStatus });

    // The confirmation email belongs here, not on the thank-you page. Comgate's
    // browser redirect races this webhook, and when the redirect wins the order is
    // still PENDING - so sending from the page meant the customer either got an
    // email for a payment that hadn't settled, or (once the flag was burned) no
    // email at all. Sending on the verified PAID transition is the only point at
    // which the payment is known to have succeeded. sendOrderConfirmation is
    // idempotent, and a mail failure must not make Comgate retry the webhook.
    if (verifiedStatus === "PAID") {
      sendOrderConfirmation(orderNumber).catch((err) =>
        console.error("Order confirmation email failed:", err)
      );
    }

    return res.status(200).json({
      msg: "Payment successfully processed",
      data: {},
    });
  } catch (err) {
    console.error("Payment update POST error:", err);
    return res.status(500).json({ msg: "Internal Server Error" });
  }
}