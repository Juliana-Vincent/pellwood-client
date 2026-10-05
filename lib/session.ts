import { customersApi } from '@/lib/strapiAdmin';
import { readSessionTokenFromCookieHeader, verifySessionToken } from '@/lib/auth';

/**
 * Resolves the logged-in customer (if any) from the httpOnly session cookie.
 * Returns null when there's no valid session - callers decide whether that's a
 * 401 or just "treat as guest".
 */
export async function getSessionUser(req: { headers: { cookie?: string | null } }) {
  const token = readSessionTokenFromCookieHeader(req.headers.cookie);
  const claims = verifySessionToken(token);
  if (!claims) return null;

  const user = await customersApi.findOne(claims.uid);
  if (!user) return null;

  // A signature alone isn't enough: logging out, changing the password or
  // completing a reset bumps tokenVersion, which retires every token issued
  // before it.
  if ((Number(user.tokenVersion) || 0) !== claims.v) return null;

  return user;
}