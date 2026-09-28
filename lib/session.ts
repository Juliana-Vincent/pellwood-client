import type { NextApiRequest } from 'next';
import { customersApi } from '@/lib/strapiAdmin';
import { readSessionTokenFromCookieHeader, verifySessionToken } from '@/lib/auth';

/**
 * Resolves the logged-in customer (if any) from the httpOnly session cookie.
 * Returns null when there's no valid session - callers decide whether that's a
 * 401 or just "treat as guest".
 */
export async function getSessionUser(req: NextApiRequest) {
  const token = readSessionTokenFromCookieHeader(req.headers.cookie);
  const userId = verifySessionToken(token);
  if (!userId) return null;

  const user = await customersApi.findOne(userId);
  return user || null;
}