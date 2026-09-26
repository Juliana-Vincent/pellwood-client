import type { NextApiRequest, NextApiResponse } from "next";
import prisma from "@/lib/db";
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
    const user = await prisma.user.findFirst({
      where: {
        email,
        resetTokenHash: tokenHash,
        resetTokenExpires: { gt: new Date() },
      },
    });

    if (!user) {
      return res.status(401).json({ msg: "Invalid or expired reset link", error: true });
    }

    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: await hashPassword(password),
        resetTokenHash: null,
        resetTokenExpires: null,
      },
    });

    return res.status(200).json({
      msg: "User successfully found and updated",
      error: false,
    });
  } catch (err) {
    console.error("user.password error:", err);
    return res.status(500).json({
      msg: "Internal Server Error", 
    });
  }
}