export function parsePrice(value: unknown): number {
  if (typeof value === "number") return value;
  if (typeof value !== "string") return 0;
  const normalized = value.replace(/\s/g, "").replace(",", ".");
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}