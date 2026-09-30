import type { NextApiRequest, NextApiResponse } from "next";
import { serializeCustomer } from "@/lib/strapiAdmin";
import { getSessionUser } from "@/lib/session";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { method } = req;

  if (method !== "GET") {
    res.setHeader("Allow", ["GET"]);
    return res.status(405).end(`Method ${method} Not Allowed`);
  }
  res.setHeader("Cache-Control", "no-store, max-age=0");

  try {
    // Returns only the session's own customer - this is the safe replacement for
    // the GET on /api/user that used to return every user in the database.
    const sessionUser = await getSessionUser(req);
    if (!sessionUser) {
      return res.status(200).json({ data: null });
    }
    return res.status(200).json({ data: serializeCustomer(sessionUser) });
  } catch (err) {
    console.error("user.me error:", err);
    return res.status(500).json({ msg: "Internal Server Error" });
  }
}