import type { NextApiRequest, NextApiResponse } from "next";
import dbConnect from "@/lib/dbConnect";
import User from "@/models/user.model";
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
    await dbConnect();
    const { password, email, resetToken } = req.body;

    if (!password?.length || !email?.length || !resetToken?.length) {
      return res.status(400).json({ msg: "Missing required fields", error: true });
    }

    const tokenHash = hashResetToken(resetToken);
    const user = await User.findOne({
      email,
      resetTokenHash: tokenHash,
      resetTokenExpires: { $gt: new Date() },
    });

    if (!user) {
      return res.status(401).json({ msg: "Invalid or expired reset link", error: true });
    }

    user.password = await hashPassword(password);
    user.resetTokenHash = null;
    user.resetTokenExpires = null;
    await user.save();

    return res.status(200).json({
      msg: "User successfully found and updated",
      error: false,
    });
  } catch (err) {
    console.error("user.password error:", err);
    return res.status(500).json({
      msg: err instanceof Error ? err.message : "Internal Server Error",
    });
  }
}
