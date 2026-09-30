/**
 * Folds a string into a comparable form: no accents, no case, no punctuation.
 * "5A Medium X-Line 4 páry" -> "5a medium x line 4 pary"
 *
 * NFD splits an accented character into its base letter plus a combining mark,
 * so stripping the U+0300-U+036F range removes the accent and leaves the letter.
 * Czech customers frequently type without diacritics, and product names mix
 * hyphens with spaces, so both have to disappear before comparing.
 */
export function normalizeText(value: unknown): string {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/** Splits a search query into the words that must all be present. */
export function searchTokens(query: string): string[] {
  return normalizeText(query).split(" ").filter(Boolean);
}