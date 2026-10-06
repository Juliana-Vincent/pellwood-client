import { describe, it, expect, vi } from "vitest";

const findOne = vi.fn(async () => ({ documentId: "o1", email: "Jana@x.cz" }));

vi.mock("@/lib/strapiAdmin", () => ({
  ordersApi: { findOne, remove: vi.fn() },
  serializeOrder: (o: any) => o,
}));
vi.mock("@/lib/session", () => ({
  getSessionUser: async () => ({ documentId: "c1", email: "jana@x.cz" }),
}));

const call = async (method: string) => {
  const { default: handler } = await import("@/pages/api/order/[id]");
  const res: any = {
    statusCode: 0,
    headers: {} as Record<string, unknown>,
    body: undefined as unknown,
    setHeader(k: string, v: unknown) { this.headers[k] = v; return this; },
    status(code: number) { this.statusCode = code; return this; },
    json(b: unknown) { this.body = b; return this; },
    end(b?: unknown) { this.body = b; return this; },
  };
  await handler({ method, query: { id: "o1" } } as any, res);
  return res;
};

describe("/api/order/[id]", () => {
  it("no longer deletes orders", async () => {
    findOne.mockClear();
    const res = await call("DELETE");
    expect(res.statusCode).toBe(405);
    // Refused before anything touched Strapi.
    expect(findOne).not.toHaveBeenCalled();
  });

  it("still lets the owner read their order, whatever the email's case", async () => {
    const res = await call("GET");
    expect(res.statusCode).toBe(200);
  });
});
