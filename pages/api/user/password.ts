import type { NextApiRequest, NextApiResponse } from "next";
import { customersApi } from "@/lib/strapiAdmin";
import { hashPassword, hashResetToken } from "@/lib/auth";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { method } = req;

  if (method !== "PUT") {
    res.setHeader("Allow", ["PUT"]);
    return res.status(405).end(`Method ${method} Not Allowed`);
  }

  try {
    const { password, email, resetToken } = req.body;

    if (!password?.length || !email?.length || !resetToken?.length) {
      return res.status(400).json({ msg: "Missing required fields", error: true });
    }

    const tokenHash = hashResetToken(resetToken);
    // Deliberately email AND token AND unexpired, so a valid token for the wrong
    // address is still rejected.
    const user = await customersApi.findFirst({
      "filters[email][$eq]": email,
      "filters[resetTokenHash][$eq]": tokenHash,
      "filters[resetTokenExpires][$gt]": new Date().toISOString(),
    });

    if (!user) {
      return res.status(401).json({ msg: "Invalid or expired reset link", error: true });
    }

    // Clearing the token in the same write that sets the password means the link
    // can't be reused.
    await customersApi.update(user.documentId, {
      password: await hashPassword(password),
      resetTokenHash: null,
      resetTokenExpires: null,
    });

    return res.status(200).json({
      msg: "User successfully found and updated",
      error: false,
    });
  } catch (err) {
    console.error("user.password error:", err);
    return res.status(500).json({ msg: "Internal Server Error" });
  }
}