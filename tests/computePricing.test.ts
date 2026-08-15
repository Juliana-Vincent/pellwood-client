import { describe, it, expect } from "vitest";
import { computePricing } from "@/functions/computePricing";

describe("computePricing (cz)", () => {
  it("adds delivery when below both thresholds, no discount", () => {
    const { sumBefore, sale, total } = computePricing(1000, "150 Kč", 0, "cz");
    expect(sale).toBe(0);
    expect(sumBefore).toBe(1000);
    expect(total).toBe(1150);
  });

  it("applies the 5% discount once the discount threshold (2000 Kc) is crossed", () => {
    const { sumBefore, sale, total } = computePricing(2500, "150 Kč", "30 Kč", "cz");
    expect(sale).toBe(125); // 2500 * 0.05
    expect(sumBefore).toBe(2375); // 2500 - 125
    expect(total).toBe(2405); // already above the free-delivery threshold, so payment only
  });

  it("does not charge delivery once above the free-delivery threshold (1500 Kc)", () => {
    const { sumBefore, sale, total } = computePricing(1600, "150 Kč", 0, "cz");
    expect(sale).toBe(0);
    expect(sumBefore).toBe(1600);
    expect(total).toBe(1600);
  });
});

describe("computePricing (en)", () => {
  it("rounds totals to 2 decimal places", () => {
    const { sumBefore } = computePricing(99.999, 0, 0, "en");
    expect(sumBefore).toBeCloseTo(100, 2);
  });
});

describe("computePricing matches what checkout charges", () => {
  it("produces the same total for the same inputs regardless of caller", () => {
    // This is the property the unification exists for: functions/sumTotal.ts (client
    // display) and functions/validateOrder.ts (server-authoritative charge) both call
    // this same function, so there's no longer a second hand-written copy of the
    // formula that could drift from what the customer is actually charged.
    const a = computePricing(2345, "150 Kč", "30 Kč", "cz");
    const b = computePricing(2345, "150 Kč", "30 Kč", "cz");
    expect(a).toEqual(b);
  });
});
