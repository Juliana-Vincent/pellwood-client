import type { NextApiRequest, NextApiResponse } from "next";
import { timingSafeEqual } from "crypto";
import { sendOrderProcessing } from "@/lib/orderEmail";

/** Constant-time compare, so the secret can't be guessed one character at a time. */
const sameSecret = (given: unknown, expected: string) => {
  if (typeof given !== "string") return false;
  const a = Buffer.from(given);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  const secret = process.env.ORDER_EMAIL_SECRET;
  if (!secret) return res.status(503).json({ msg: "ORDER_EMAIL_SECRET is not configured" });
  if (!sameSecret(req.headers["x-internal-secret"], secret)) return res.status(401).json({ msg: "Unauthorized" });

  const documentId = req.body?.documentId;
  if (typeof documentId !== "string" || !/^[a-z0-9]{10,40}$/i.test(documentId)) {
    return res.status(400).json({ msg: "Invalid documentId" });
  }

  try {
    const result = await sendOrderProcessing(documentId);
    return res.status(result === "not-found" ? 404 : 200).json({ result });
  } catch (err) {
    console.error("Order processing email failed:", err);
    return res.status(500).json({ msg: "Email failed" });
  }
}
