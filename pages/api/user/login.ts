import type { NextApiRequest, NextApiResponse } from "next";
import { emailFilter, normalizeEmail, sameEmail } from "@/helpers/email";
import { customersApi, serializeCustomer } from "@/lib/strapiAdmin";
import { verifyPassword, createSessionToken, buildSessionCookie } from "@/lib/auth";
import { checkAuthRateLimit } from "@/lib/rateLimit";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { method } = req;

  if (method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).end(`Method ${method} Not Allowed`);
  }

  const retryAfter = checkAuthRateLimit(req, "login", 10, 300);
  if (retryAfter) {
    res.setHeader("Retry-After", String(retryAfter));
    return res.status(429).json({ msg: "Too many attempts", error: true });
  }

  try {
    const { email, password } = req.body;

    const found = email ? await customersApi.findFirst(emailFilter(email)) : null;
    const user = found && sameEmail(found.email, email) ? found : null;
    const passwordMatches = user ? await verifyPassword(password, user.password) : false;

    if (user && passwordMatches) {
      res.setHeader("Set-Cookie", buildSessionCookie(createSessionToken(user.documentId, Number(user.tokenVersion) || 0)));
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