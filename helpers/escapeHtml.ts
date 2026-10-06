/**
 * Escapes text for an HTML body or a double-quoted attribute.
 *
 * Not escapeXml: that one writes &apos;, which is XML, and older Outlook shows it
 * literally in an HTML email. &#39; works everywhere.
 */
export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Escapes every string in a value, however deeply nested; leaves the rest alone. */
export function escapeHtmlDeep<T>(value: T): T {
  if (typeof value === "string") return escapeHtml(value) as unknown as T;
  if (Array.isArray(value)) return value.map(escapeHtmlDeep) as unknown as T;
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([k, v]) => [k, escapeHtmlDeep(v)]),
    ) as T;
  }
  return value;
}
