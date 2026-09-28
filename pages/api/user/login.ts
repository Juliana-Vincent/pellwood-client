import type { NextApiRequest, NextApiResponse } from "next";
import { customersApi, serializeCustomer } from "@/lib/strapiAdmin";
import { verifyPassword, createSessionToken, buildSessionCookie } from "@/lib/auth";

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
    const { email, password } = req.body;

    const user = email
      ? await customersApi.findFirst({ "filters[email][$eq]": email })
      : null;
    const passwordMatches = user ? await verifyPassword(password, user.password) : false;

    if (user && passwordMatches) {
      res.setHeader("Set-Cookie", buildSessionCookie(createSessionToken(user.documentId)));
      return res.status(200).json({
        msg: "User successfully found",
        error: false,
        data: serializeCustomer(user),
      });
    }

    return res.status(401).json({ msg: "error", error: true });
  } catch (err) {
    console.error("user.login error:", err);
    return res.status(500).json({ msg: "Internal Server Error" });
  }
}