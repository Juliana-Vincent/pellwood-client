import { describe, it, expect } from "vitest";
import sumTotal, { BasketItem } from "@/functions/sumTotal";

function run(
  basket: BasketItem[],
  lang: "cz" | "en",
  delivery: string | number = 0,
  payment: string | number = 0
) {
  let sumBefore: number | string = 0;
  let sale: number | string = 0;
  let sum: number | string = 0;
  sumTotal(
    delivery,
    payment,
    basket,
    (v) => (sumBefore = v),
    (v) => (sale = v),
    (v) => (sum = v),
    lang
  );
  return { sumBefore, sale, sum };
}

describe("sumTotal (cz)", () => {
  it("adds delivery when the basket is below both thresholds", () => {
    const { sumBefore, sale, sum } = run(
      [{ variantPrice: 500, countVariant: 2 }], // 1000 Kc
      "cz",
      150,
      0
    );
    expect(sumBefore).toBe(1000);
    expect(sale).toBe(0);
    expect(sum).toBe(1150);
  });

  it("applies the 5% discount once the discount threshold (2000 Kc) is crossed", () => {
    const { sumBefore, sale, sum } = run(
      [{ variantPrice: 2500, countVariant: 1 }],
      "cz",
      150,
      30
    );
    expect(sale).toBe(125); // 2500 * 0.05
    expect(sumBefore).toBe(2375); // 2500 - 125
    expect(sum).toBe(2405); // + payment only, already above free-delivery threshold
  });

  it("does not charge delivery once above the free-delivery threshold (1500 Kc)", () => {
    const { sumBefore, sale, sum } = run(
      [{ variantPrice: 1600, countVariant: 1 }],
      "cz",
      150,
      0
    );
    expect(sale).toBe(0);
    expect(sumBefore).toBe(1600);
    expect(sum).toBe(1600);
  });
});

describe("sumTotal (en)", () => {
  it("rounds EUR totals to 2 decimal places", () => {
    const { sumBefore } = run(
      [{ variantPrice: 33.333, countVariant: 3 }], // 99.999
      "en"
    );
    expect(sumBefore).toBeCloseTo(100, 2);
  });
});
