const STRAPI_URL = (process.env.STRAPI_INTERNAL_URL || 'http://127.0.0.1:4501').replace(/\/$/, '');

export class StrapiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.name = 'StrapiError';
    this.status = status;
  }
}

function requireToken(): string {
  const token = process.env.STRAPI_WRITE_TOKEN;
  if (!token) {
    throw new Error('STRAPI_WRITE_TOKEN is not configured');
  }
  return token;
}

type QueryParams = Record<string, string | number | boolean | undefined>;

function toQuery(params: QueryParams = {}): string {
  const parts = Object.entries(params)
    .filter(([, value]) => value !== undefined)
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`);
  return parts.length ? `?${parts.join('&')}` : '';
}

async function request<T = any>(path: string, init: RequestInit = {}): Promise<T> {
  // This module carries a token that can read password hashes. If it is ever
  // imported into a component that ships to the browser, fail loudly here
  // rather than leak it.
  if (typeof window !== 'undefined') {
    throw new Error('lib/strapiAdmin is server-only and must not be imported client-side');
  }

  const res = await fetch(`${STRAPI_URL}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${requireToken()}`,
      ...(init.headers || {}),
    },
  });

  const text = await res.text();
  let body: any = null;
  if (text) {
    try {
      body = JSON.parse(text);
    } catch {
      // nginx or Strapi can answer with HTML on a hard failure; don't let a
      // parse error masquerade as a data problem.
      throw new StrapiError(res.status, `Non-JSON response from Strapi: ${text.slice(0, 200)}`);
    }
  }

  if (!res.ok) {
    throw new StrapiError(res.status, body?.error?.message || res.statusText);
  }

  return body as T;
}

function collection(name: string) {
  return {
    async find<T = any>(params: QueryParams = {}): Promise<T[]> {
      const body = await request(`/api/${name}${toQuery(params)}`);
      return body?.data ?? [];
    },

    async findFirst<T = any>(params: QueryParams = {}): Promise<T | null> {
      const rows = await this.find<T>({ ...params, 'pagination[pageSize]': 1 });
      return rows[0] ?? null;
    },

    async findOne<T = any>(documentId: string, params: QueryParams = {}): Promise<T | null> {
      try {
        const body = await request(`/api/${name}/${documentId}${toQuery(params)}`);
        return body?.data ?? null;
      } catch (err) {
        if (err instanceof StrapiError && err.status === 404) return null;
        throw err;
      }
    },

    async create<T = any>(data: Record<string, any>): Promise<T> {
      const body = await request(`/api/${name}`, {
        method: 'POST',
        body: JSON.stringify({ data }),
      });
      return body?.data;
    },

    async update<T = any>(documentId: string, data: Record<string, any>): Promise<T> {
      const body = await request(`/api/${name}/${documentId}`, {
        method: 'PUT',
        body: JSON.stringify({ data }),
      });
      return body?.data;
    },

    async remove(documentId: string): Promise<void> {
      await request(`/api/${name}/${documentId}`, { method: 'DELETE' });
    },
  };
}

export const ordersApi = collection('orders');
export const customersApi = collection('customers');