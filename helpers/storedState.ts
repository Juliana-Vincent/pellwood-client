// Shape checks for values restored from localStorage. Valid JSON is not the same
// as a valid basket: "null", "{}" or "[null]" parsed fine and then threw inside
// the reducer or the mini-cart on every render, blanking the whole site.

/** A basket: only lines that are objects with an id and a positive quantity. */
export const asBasket = (value: unknown): any[] | undefined =>
  Array.isArray(value)
    ? value.filter(
        (item) =>
          item &&
          typeof item === "object" &&
          item.id !== undefined &&
          Number.isFinite(Number(item.countVariant)) &&
          Number(item.countVariant) > 0,
      )
    : undefined;

export const asCount = (value: unknown): number | undefined =>
  typeof value === "number" && Number.isFinite(value) && value >= 0 ? value : undefined;

export const asObject = (value: unknown): Record<string, unknown> | undefined =>
  value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;
