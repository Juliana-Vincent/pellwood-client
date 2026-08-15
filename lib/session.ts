import type { NextApiRequest } from 'next';
import dbConnect from '@/lib/dbConnect';
import User from '@/models/user.model';
import { readSessionTokenFromCookieHeader, verifySessionToken } from '@/lib/auth';

/**
 * Resolves the logged-in user (if any) from the httpOnly session cookie.
 * Returns null when there's no valid session - callers decide whether that's a
 * 401 or just "treat as guest".
 */
export async function getSessionUser(req: NextApiRequest) {
  const token = readSessionTokenFromCookieHeader(req.headers.cookie);
  const userId = verifySessionToken(token);
  if (!userId) return null;

  await dbConnect();
  const user = await User.findById(userId);
  return user || null;
}
