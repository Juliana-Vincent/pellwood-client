import type { NextApiRequest, NextApiResponse } from "next";
import { buildClearSessionCookie } from "@/lib/auth";
import { getSessionUser } from "@/lib/session";
import { customersApi } from "@/lib/strapiAdmin";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  // Clearing the cookie only removes this browser's copy. Bumping tokenVersion is
  // what actually ends the session, so a token captured beforehand stops working
  // instead of staying valid for the rest of its 30 days.
  try {
    const user = await getSessionUser(req);
    if (user) {
      await customersApi.update(user.documentId, {
        tokenVersion: (Number(user.tokenVersion) || 0) + 1,
      });
    }
  } catch (err) {
    // Never fail a logout - the cookie still gets cleared below.
    console.error("logout: could not bump tokenVersion:", err);
  }

  res.setHeader("Set-Cookie", buildClearSessionCookie());
  return res.status(200).json({ msg: "Logged out" });
}
