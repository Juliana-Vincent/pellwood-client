import { describe, it, expect, vi, beforeEach } from "vitest";

const orders = new Map<string, any>();
const updates: Array<[string, any]> = [];
const sent: any[] = [];

vi.mock("@/lib/strapiAdmin", () => ({
  ordersApi: {
    findOne: async (id: string) => orders.get(id) ?? null,
    findFirst: async () => null,
    update: async (id: string, data: any) => {
      updates.push([id, data]);
      orders.set(id, { ...orders.get(id), ...data });
    },
  },
}));
vi.mock("@/lib/mailer-resend", () => ({
  sendEmail: async (options: any) => {
    sent.push(options);
    return { messageId: "x" };
  },
}));
vi.mock("@/lib/mailer-sendgrid", () => ({ sendEmail: async () => ({}) }));
vi.mock("@/lib/mailer", () => ({ createTransporter: async () => ({ sendMail: async () => ({}) }) }));

import { sendOrderProcessing } from "@/lib/orderEmail";

const order = (extra: Record<string, unknown> = {}) => ({
  documentId: "abc123def456",
  idOrder: 1234567,
  email: "jana@example.com",
  name: "Jana",
  currency: "Kč",
  sum: 712,
  state: "processing",
  deliveryMethod: "PPL standardní doručení v ČR",
  basket: [{ nameProduct: "5A Medium", variantName: "Premium Habr", countVariant: 2 }],
  ...extra,
});

describe("'Vyřizuje se' e-mail", () => {
  beforeEach(() => {
    orders.clear();
    updates.length = 0;
    sent.length = 0;
    process.env.RESEND_API_KEY = "test";
  });

  it("sends once, in Czech", async () => {
    orders.set("abc123def456", order());
    expect(await sendOrderProcessing("abc123def456")).toBe("sent");
    expect(await sendOrderProcessing("abc123def456")).toBe("already-sent");

    expect(sent).toHaveLength(1);
    expect(sent[0].to).toBe("jana@example.com");
    expect(sent[0].subject).toBe("Objednávka č. 1234567 se vyřizuje");
    expect(sent[0].html).toContain("Dobrý den,");
    expect(sent[0].html).toContain("5A Medium - Premium Habr");
    expect(sent[0].html).toContain("pošle vám informace");
  });

  it("writes English for euro orders, escapes the name, and has a pickup line", async () => {
    orders.set("abc123def456", order({ currency: "€", deliveryMethod: "On pickup", name: "Tom <i>" }));
    await sendOrderProcessing("abc123def456");
    expect(sent[0].subject).toBe("Order no. 1234567 is being processed");
    expect(sent[0].html).toContain("Hello Tom &lt;i&gt;,");
    expect(sent[0].html).toContain("ready for pickup");
  });

  it("does nothing when the order is no longer 'Vyřizuje se'", async () => {
    orders.set("abc123def456", order({ state: "shipped" }));
    expect(await sendOrderProcessing("abc123def456")).toBe("not-processing");
    expect(sent).toHaveLength(0);
    expect(updates).toHaveLength(0);
  });
});
