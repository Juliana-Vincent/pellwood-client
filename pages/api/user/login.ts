import type { NextApiRequest, NextApiResponse } from "next";
import dbConnect from "@/lib/dbConnect";
import User from "@/models/user.model";
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
    await dbConnect();
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    const passwordMatches = user ? await verifyPassword(password, user.password) : false;

    if (user && passwordMatches) {
      const { password: _pw, resetTokenHash, resetTokenExpires, ...safeUser } = user.toObject();
      res.setHeader("Set-Cookie", buildSessionCookie(createSessionToken(String(user._id))));
      return res.status(200).json({
        msg: "User successfully found",
        error: false,
        data: safeUser,
      });
    }

    return res.status(401).json({ msg: "error", error: true });
  } catch (err) {
    console.error("user.login error:", err);
    return res.status(500).json({
      msg: "Internal Server Error", // real error is already logged server-side above
    });
  }
}
