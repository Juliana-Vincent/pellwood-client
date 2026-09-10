import type { StrapiImage } from "@/types/image";

const STRAPI_URL = process.env.NEXT_PUBLIC_STRAPI_API_URL || 'http://localhost:1337';


export function getStrapiURL(path = '') {
  return `${STRAPI_URL}${path}`;
}

/**
 * Modern, dependency-free deep object serializer for Strapi URL queries.
 * Replaces the deprecated `qs` library.
 */
function buildQuery(params: Record<string, unknown> | undefined, prefix = ''): URLSearchParams {
  const query = new URLSearchParams();

  if (!params) return query;

  Object.keys(params).forEach((key) => {
    const value = params[key];
    const newPrefix = prefix ? `${prefix}[${key}]` : key;

    if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
      const nestedQuery = buildQuery(value as Record<string, unknown>, newPrefix);
      nestedQuery.forEach((v, k) => query.append(k, v));
    } else if (Array.isArray(value)) {
      value.forEach((val, i) => {
        if (typeof val === 'object' && val !== null) {
          const nestedQuery = buildQuery(val as Record<string, unknown>, `${newPrefix}[${i}]`);
          nestedQuery.forEach((v, k) => query.append(k, v));
        } else {
          query.append(`${newPrefix}[${i}]`, String(val));
        }
      });
    } else if (value !== undefined) {
      query.append(newPrefix, String(value));
    }
  });

  return query;
}

/**
 * Shape of the query params fetchAPI accepts - deliberately loose on the nested
 * filter/populate DSL (Strapi's own filter operators like $eq/$in/$containsi and
 * per-relation populate objects are open-ended by design), but documents the
 * top-level shape every call site actually uses instead of a bare `any`.
 */
export interface StrapiQueryParams {
  locale?: string;
  populate?: string | string[] | Record<string, unknown>;
  filters?: Record<string, unknown>;
  pagination?: { start?: number; limit?: number; page?: number; pageSize?: number };
  sort?: string | string[];
  fields?: string[];
  [key: string]: unknown;
}

export interface StrapiResponse<T = unknown> {
  data?: T;
  meta?: Record<string, unknown>;
}

const FETCH_TIMEOUT_MS = Number(process.env.STRAPI_TIMEOUT_MS || 45000);
const RETRY_COUNT = 1;
const RETRY_DELAY_MS = 300;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function fetchWithTimeout(url: string, timeoutMs: number): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

// Helper to fetch data from Strapi API
export async function fetchAPI<T = any>(
  path: string,
  urlParamsObject: StrapiQueryParams = {}
): Promise<StrapiResponse<T>> {
  // No default populate - relations/components are only fetched when a call site
  // explicitly asks for them, instead of every request pulling every relation by
  // default (populate: '*' recurses into components too, e.g. every product's
  // linkedProducts).
  const searchParams = buildQuery(urlParamsObject);
  const queryString = searchParams.toString();

  const requestUrl = getStrapiURL(`/api/${path}${queryString ? `?${queryString}` : ''}`);

  let lastError: unknown;
  for (let attempt = 0; attempt <= RETRY_COUNT; attempt++) {
    try {
      const response = await fetchWithTimeout(requestUrl, FETCH_TIMEOUT_MS);

      if (!response.ok) {
        // Retry only on transient server-side failures - a 4xx means the request
        // itself is wrong and retrying won't change that.
        if (response.status >= 500 && attempt < RETRY_COUNT) {
          lastError = new Error(`Strapi responded ${response.status} ${response.statusText}`);
          await sleep(RETRY_DELAY_MS);
          continue;
        }
        console.error(`Error fetching from Strapi: ${response.statusText}`);
        throw new Error(`An error occurred while fetching data from Strapi.`);
      }

      try {
        const text = await response.text();
        if (!text) return {};
        return JSON.parse(text);
      } catch (error) {
        console.error(`Error parsing JSON from Strapi at ${requestUrl}:`, error);
        return {};
      }
    } catch (error) {
      const isAbort = error instanceof Error && error.name === 'AbortError';
      lastError = isAbort ? new Error(`Strapi request timed out after ${FETCH_TIMEOUT_MS}ms: ${requestUrl}`) : error;

      if (attempt < RETRY_COUNT) {
        await sleep(RETRY_DELAY_MS);
        continue;
      }
      console.error(`Failed to fetch from Strapi at ${requestUrl}:`, lastError);
      throw lastError;
    }
  }

  // Unreachable - the loop above always returns or throws - but keeps TypeScript
  // happy about every code path returning a value.
  throw lastError;
}

interface StrapiImageHandle {
  /** Swaps in the closest pre-generated Strapi format at or above the given width. */
  width: (w: number) => StrapiImageHandle;
  url: () => string;
  toString: () => string;
}

/** Strapi v4's alternate REST shape ({ data: { attributes: {...} } }), still returned by some relations. */
type StrapiImageWrapped = { data?: { attributes?: StrapiImage } };

export type StrapiImageInput = string | StrapiImage | StrapiImageWrapped | null | undefined;

/**
 * Resolves a Strapi media object/relation to a usable URL. Strapi pre-generates a
 * fixed set of format sizes at upload time (thumbnail/small/medium/large), unlike
 * Sanity's arbitrary-width image API, so .width() picks the closest one instead of
 * requesting an exact size.
 */
export function urlFor(image: StrapiImageInput): StrapiImageHandle {
  let imageUrl = '';
  let formats: StrapiImage['formats'] | null = null;

  if (image) {
    if (typeof image === 'string') {
      imageUrl = image;
    } else {
      const wrapped = image as StrapiImageWrapped;
      const flat = image as StrapiImage;
      imageUrl = flat.url || wrapped.data?.attributes?.url || '';
      formats = flat.formats || wrapped.data?.attributes?.formats || null;
    }
  }

  const resolvedUrl = imageUrl ? (imageUrl.startsWith('/') ? getStrapiURL(imageUrl) : imageUrl) : '';

  const createHandle = (currentUrl: string): StrapiImageHandle => ({
    url: () => currentUrl,
    toString: () => currentUrl,
    width: (w: number) => {
      let widthUrl = currentUrl;
      if (formats && w) {
        if (w <= 150 && formats.thumbnail) widthUrl = getStrapiURL(formats.thumbnail.url);
        else if (w <= 500 && formats.small) widthUrl = getStrapiURL(formats.small.url);
        else if (w <= 750 && formats.medium) widthUrl = getStrapiURL(formats.medium.url);
        else if (w <= 1000 && formats.large) widthUrl = getStrapiURL(formats.large.url);
      }
      return createHandle(widthUrl);
    },
  });

  return createHandle(resolvedUrl);
}
