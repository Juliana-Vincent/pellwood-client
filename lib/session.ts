import type { NextApiRequest } from 'next';
import prisma from '@/lib/db';
import { readSessionTokenFromCookieHeader, verifySessionToken } from '@/lib/auth';

export async function getSessionUser(req: NextApiRequest) {
  const token = readSessionTokenFromCookieHeader(req.headers.cookie);
  const userId = verifySessionToken(token);
  if (!userId) return null;

  const user = await prisma.user.findUnique({ where: { id: userId } });
  return user || null;
}