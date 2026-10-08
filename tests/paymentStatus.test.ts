import { describe, it, expect } from "vitest";

describe("the payment status survives the admin", () => {
  it("reads the new field first", async () => {
    const { paymentStatusOf } = await import("@/helpers/paymentStatus");
    expect(paymentStatusOf({ paymentStatus: "PAID" })).toBe("PAID");
    // Written before the rename.
    expect(paymentStatusOf({ status: "PAID" })).toBe("PAID");
    expect(paymentStatusOf({ paymentStatus: "PENDING", status: "published" })).toBe("PENDING");
  });

  it("never reports Strapi's document status as a payment", async () => {
    const { paymentStatusOf } = await import("@/helpers/paymentStatus");
    // Saving an order in the old admin overwrote the Comgate value with this.
    expect(paymentStatusOf({ status: "published" })).toBe("");
    expect(paymentStatusOf(null)).toBe("");
    expect(paymentStatusOf({})).toBe("");
  });
});
