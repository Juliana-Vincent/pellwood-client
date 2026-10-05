import { describe, it, expect } from "vitest";
import { rateLimit } from "@/lib/rateLimit";

describe("rateLimit", () => {
  it("allows up to the limit and refuses after it", () => {
    const key = `test-${Math.random()}`;
    for (let i = 0; i < 3; i++) {
      expect(rateLimit(key, 3, 60).allowed).toBe(true);
    }
    const blocked = rateLimit(key, 3, 60);
    expect(blocked.allowed).toBe(false);
    expect(blocked.retryAfterSeconds).toBeGreaterThan(0);
  });

  it("keeps separate buckets per key, so one caller cannot lock out another", () => {
    const a = `a-${Math.random()}`;
    const b = `b-${Math.random()}`;
    rateLimit(a, 1, 60);
    expect(rateLimit(a, 1, 60).allowed).toBe(false);
    expect(rateLimit(b, 1, 60).allowed).toBe(true);
  });

  it("starts a fresh window once the old one has expired", async () => {
    const key = `expiry-${Math.random()}`;
    expect(rateLimit(key, 1, 1).allowed).toBe(true);
    expect(rateLimit(key, 1, 1).allowed).toBe(false);
    await new Promise((resolve) => setTimeout(resolve, 1100));
    expect(rateLimit(key, 1, 1).allowed).toBe(true);
  });
});
