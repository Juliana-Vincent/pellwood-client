// Links inside CMS rich text are typed by whoever writes the content, so they
// arrive with whatever was pasted: tracking parameters from wherever the URL was
// copied, and no new-window behaviour. These two helpers are applied by
// components/BlockContent.tsx to every link in a rich-text block.

/** Hosts that count as this site, so they are never treated as external. */
const INTERNAL_HOSTS = [
  "pellwood.com",
  "www.pellwood.com",
  "pellwood.hardart.cz",
  "localhost",
];

/** Click-tracking junk that identifies where the link was copied from. */
const TRACKING_PARAMS = [
  /^utm_/i,
  /^fbclid$/i,
  /^gclid$/i,
  /^gbraid$/i,
  /^wbraid$/i,
  /^msclkid$/i,
  /^mc_[ce]id$/i,
  /^_hs(enc|mi)$/i,
  /^igshid$/i,
];

/** A base only used to make relative URLs parseable; never emitted. */
const PARSE_BASE = "https://pellwood.com";

function parse(raw: string): { url: URL; wasRelative: boolean } | null {
  const value = (raw || "").trim();
  if (!value) return null;
  // Anchors and non-http schemes (mailto:, tel:) have nothing to clean and are
  // never external destinations in the sense that matters here.
  if (value.startsWith("#")) return null;
  try {
    const wasRelative = !/^[a-z][a-z0-9+.-]*:/i.test(value);
    return { url: new URL(value, PARSE_BASE), wasRelative };
  } catch {
    return null;
  }
}

/** True for a link that leaves the site over http(s). */
export function isExternalUrl(raw: string): boolean {
  const parsed = parse(raw);
  if (!parsed) return false;
  const { url, wasRelative } = parsed;
  if (wasRelative) return false;
  if (url.protocol !== "http:" && url.protocol !== "https:") return false;
  return !INTERNAL_HOSTS.includes(url.hostname.toLowerCase());
}

/**
 * Strips click-tracking parameters, leaving everything else exactly as written.
 *
 * Deliberately does NOT rewrite http:// to https://. A host that does not serve
 * https would turn a working link into a broken one, and there is no way to know
 * from here which of them do - those belong in Strapi, fixed at the source.
 */
export function cleanUrl(raw: string): string {
  const parsed = parse(raw);
  if (!parsed) return raw;
  const { url, wasRelative } = parsed;

  const doomed = [...url.searchParams.keys()].filter((key) =>
    TRACKING_PARAMS.some((pattern) => pattern.test(key)),
  );
  if (!doomed.length) return raw;
  for (const key of doomed) url.searchParams.delete(key);

  // Rebuild in the shape it came in, so a relative link stays relative.
  const tail = `${url.pathname}${url.search}${url.hash}`;
  return wasRelative ? tail : `${url.origin}${tail}`;
}
