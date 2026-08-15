import type { NextApiRequest, NextApiResponse } from "next";
import { buildClearSessionCookie } from "@/lib/auth";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  res.setHeader("Set-Cookie", buildClearSessionCookie());
  return res.status(200).json({ msg: "Logged out" });
}
