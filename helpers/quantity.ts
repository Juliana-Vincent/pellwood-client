export const MIN_QUANTITY = 1;
export const MAX_QUANTITY = 1000;

export function clampQuantity(raw: unknown): { value: number; clamped: boolean } {
  if (raw === "" || raw === null || raw === undefined) {
    return { value: MIN_QUANTITY, clamped: false };
  }
  const n = Number(raw);
  if (!Number.isFinite(n)) {
    return { value: MIN_QUANTITY, clamped: true };
  }
  const value = Math.min(MAX_QUANTITY, Math.max(MIN_QUANTITY, Math.floor(n)));
  return { value, clamped: value !== n };
}