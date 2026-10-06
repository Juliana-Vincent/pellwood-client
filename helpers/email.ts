/**
 * Email addresses are compared case-insensitively everywhere in the shop.
 *
 * Nothing lowercased them before, so "Jana@x.cz" and "jana@x.cz" could become two
 * accounts, logging in with different capitalisation failed, and an order placed
 * as a guest under one spelling never showed in the account under the other.
 * New addresses are stored lowercased; lookups use Strapi's $eqi so the ~1870
 * migrated customers, stored however they were typed, still match.
 */
export function normalizeEmail(email: unknown): string {
  return typeof email === "string" ? email.trim().toLowerCase() : "";
}

export function sameEmail(a: unknown, b: unknown): boolean {
  const left = normalizeEmail(a);
  return left !== "" && left === normalizeEmail(b);
}

/**
 * Strapi filter for one email, case-insensitive.
 *
 * Strapi 5 compiles $eqi to `LOWER(column) LIKE LOWER(?)` and passes the value
 * through unescaped, so % and _ in it are wildcards - and _ is legal in an email
 * address. Unescaped, "jan_novak@x.cz" would also match "janXnovak@x.cz". Postgres
 * LIKE treats backslash as the escape character by default.
 *
 * Callers still confirm the match with sameEmail(): this filter narrows the
 * query, it is not what decides who owns a record.
 */
export function emailFilter(email: unknown): Record<string, string> {
  const escaped = normalizeEmail(email).replace(/[\\%_]/g, (c) => `\\${c}`);
  return { "filters[email][$eqi]": escaped };
}
