import type { NextApiRequest } from "next";

/**
 * A small in-process sliding-window limiter for the unauthenticated auth
 * endpoints. There was none at all: registration answers 409 for an address that
 * already exists, which is a yes/no oracle for any email, and login and password
 * reset could be probed without limit.
 *
 * Deliberately in-memory. pm2 runs this app in fork mode with a single instance
 * (ecosystem.config.js), so one process sees every request. If that ever becomes
 * cluster mode or more than one instance, this stops being accurate and should
 * move to Redis or the database - it would then limit per worker rather than per
 * site.
 */
type Hit = { count: number; resetAt: number };

const buckets = new Map<string, Hit>();

// Keep the map from growing without bound on a long-lived process.
const MAX_KEYS = 10_000;

export function clientIp(req: NextApiRequest): string {
  const forwarded = req.headers["x-forwarded-for"];
  const raw = Array.isArray(forwarded) ? forwarded[0] : forwarded;
  const first = raw?.split(",")[0]?.trim();
  return first || req.socket?.remoteAddress || "unknown";
}

export interface RateLimitResult {
  allowed: boolean;
  retryAfterSeconds: number;
}

export function rateLimit(
  key: string,
  limit: number,
  windowSeconds: number
): RateLimitResult {
  const now = Date.now();
  const existing = buckets.get(key);

  if (!existing || existing.resetAt <= now) {
    if (buckets.size >= MAX_KEYS) {
      for (const [k, v] of buckets) {
        if (v.resetAt <= now) buckets.delete(k);
      }
      if (buckets.size >= MAX_KEYS) buckets.clear();
    }
    buckets.set(key, { count: 1, resetAt: now + windowSeconds * 1000 });
    return { allowed: true, retryAfterSeconds: 0 };
  }

  existing.count += 1;
  if (existing.count > limit) {
    return {
      allowed: false,
      retryAfterSeconds: Math.max(1, Math.ceil((existing.resetAt - now) / 1000)),
    };
  }

  return { allowed: true, retryAfterSeconds: 0 };
}

/** Convenience wrapper: returns null when allowed, or the seconds to wait. */
export function checkAuthRateLimit(
  req: NextApiRequest,
  bucket: string,
  limit = 10,
  windowSeconds = 300
): number | null {
  const { allowed, retryAfterSeconds } = rateLimit(
    `${bucket}:${clientIp(req)}`,
    limit,
    windowSeconds
  );
  return allowed ? null : retryAfterSeconds;
}
