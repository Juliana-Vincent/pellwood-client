import { describe, it, expect } from "vitest";
import { optionPriceToNumber } from "@/functions/shippingOptions";

describe("optionPriceToNumber", () => {
  it("parses a Czech crown amount", () => {
    expect(optionPriceToNumber("150 Kč")).toBe(150);
  });

  it("parses a euro amount", () => {
    expect(optionPriceToNumber("10 €")).toBe(10);
  });

  it("treats ZDARMA and FREE as zero", () => {
    expect(optionPriceToNumber("ZDARMA")).toBe(0);
    expect(optionPriceToNumber("FREE")).toBe(0);
  });

  it("handles a comma decimal separator", () => {
    expect(optionPriceToNumber("12,50 €")).toBe(12.5);
  });
});
