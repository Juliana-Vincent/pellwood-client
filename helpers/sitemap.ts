import { escapeXml } from './escapeXml';

/** "2026-10-06T14:03:11.123Z" -> "2026-10-06"; anything unreadable -> undefined. */
export function lastmodOf(updatedAt: unknown): string | undefined {
  if (typeof updatedAt !== 'string' && !(updatedAt instanceof Date)) return undefined;
  const date = new Date(updatedAt as string);
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString().slice(0, 10);
}

/**
 * One <url> entry. lastmod comes from Strapi's updatedAt, so a search engine can
 * tell which of ~260 pages changed instead of recrawling all of them; pages with
 * no single source date (the homepage, the catalogue) simply leave it out.
 * The location is escaped: product slugs are free text in Strapi, not uids.
 */
export function sitemapEntry(base: string, path: string, updatedAt?: unknown): string {
  const url = `${base}${path.startsWith('/') ? path : `/${path}`}`;
  const lastmod = lastmodOf(updatedAt);
  return [
    '  <url>',
    `    <loc>${escapeXml(url)}</loc>`,
    ...(lastmod ? [`    <lastmod>${lastmod}</lastmod>`] : []),
    '  </url>',
  ].join('\n');
}
