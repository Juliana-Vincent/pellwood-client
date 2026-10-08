/**
 * Comgate's verified payment status for an order.
 *
 * It used to be stored in `status`. Strapi 5 reserves that word for a document's
 * draft/published state, so the admin displayed the order's payment status as
 * "published" and wrote that value back over the real one whenever anyone saved
 * the order. The field is now `paymentStatus`; `status` is only read as a
 * fallback for orders placed before the change, and "published" there means the
 * old value was already destroyed.
 */
export function paymentStatusOf(order: { paymentStatus?: unknown; status?: unknown } | null | undefined): string {
  const current = typeof order?.paymentStatus === "string" ? order.paymentStatus : "";
  if (current) return current;
  const legacy = typeof order?.status === "string" ? order.status : "";
  return legacy === "published" ? "" : legacy;
}
