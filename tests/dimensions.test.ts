import { describe, it, expect } from "vitest";

const sticks = (extra: Record<string, unknown> = {}) => ({
  title: "5A Medium",
  parametrs: [
    { title: "Délka", value: "400 mm" },
    { title: "Průměr", value: "14,4 mm" },
    { title: "Materiál", value: "habr" },
  ],
  ...extra,
});

describe("length and diameter", () => {
  it("prefer the new fields and fall back to the old parameters", async () => {
    const { productDimension } = await import("@/helpers/dimensions");
    expect(productDimension(sticks(), "length")).toBe(400);
    expect(productDimension(sticks({ length: 420 }), "length")).toBe(420);
    expect(productDimension({ title: "x" }, "diameter")).toBeNull();
  });

  it("read the field however the editor typed it", async () => {
    const { productDimension } = await import("@/helpers/dimensions");
    // The field is text, so a Czech comma, an English dot and a stray unit all work.
    expect(productDimension({ diameter: "14,4" }, "diameter")).toBe(14.4);
    expect(productDimension({ diameter: "14.4" }, "diameter")).toBe(14.4);
    expect(productDimension({ diameter: "14,4 mm" }, "diameter")).toBe(14.4);
    expect(productDimension({ diameter: 14.4 }, "diameter")).toBe(14.4);
    expect(productDimension({ diameter: "  " }, "diameter")).toBeNull();
    expect(productDimension({ diameter: "abc" }, "diameter")).toBeNull();
  });

  it("show the separator each language writes", async () => {
    const { formatDimension } = await import("@/helpers/dimensions");
    expect(formatDimension(14.4, "cz")).toBe("14,4 mm");
    expect(formatDimension(14.4, "en")).toBe("14.4 mm");
    expect(formatDimension(400, "cz")).toBe("400 mm");
  });

  it("read a title that was typed with a trailing space", async () => {
    const { productDimension } = await import("@/helpers/dimensions");
    // Three live products have "Diameter " and were invisible to the filter.
    const product = { parametrs: [{ title: "Diameter ", value: "12 mm" }] };
    expect(productDimension(product, "diameter")).toBe(12);
  });

  it("do not take a range or another millimetre parameter for the real one", async () => {
    const { productDimension } = await import("@/helpers/dimensions");
    const brushes = {
      parametrs: [
        { title: "Průměr madla", value: "17-23 mm" },
        { title: "Průměr filcové bambule", value: "58mm" },
      ],
    };
    expect(productDimension(brushes, "diameter")).toBeNull();
  });

  it("list the dimensions first and never twice", async () => {
    const { parameterRows } = await import("@/helpers/dimensions");
    const rows = parameterRows(
      sticks({ length: "400", diameter: "14,4" }),
      { length: "Délka", diameter: "Průměr" },
      "cz",
    );
    expect(rows).toEqual([
      { title: "Délka", value: "400 mm" },
      { title: "Průměr", value: "14,4 mm" },
      { title: "Materiál", value: "habr" },
    ]);
  });
});

describe("the catalogue filter", () => {
  it("uses the shared reader, so a product filled in either way is findable", async () => {
    const { productDimension } = await import("@/helpers/dimensions");
    const inRange = (product: any, min: number, max: number) => {
      const value = productDimension(product, "diameter");
      return value !== null && value >= min && value <= max;
    };
    expect(inRange({ diameter: 14.4 }, 14, 15)).toBe(true);
    expect(inRange({ parametrs: [{ title: "Diameter ", value: "14,4 mm" }] }, 14, 15)).toBe(true);
    expect(inRange({ diameter: 16 }, 14, 15)).toBe(false);
  });
});
