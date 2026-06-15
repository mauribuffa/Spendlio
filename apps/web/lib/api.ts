import 'server-only';
import { z } from 'zod';
import { API_BASE, DEMO_USER_ID } from './config';

/**
 * Typed client for the Spendlio API (apps/api, NestJS).
 *
 * Server-side only — it carries the dev `x-user-id` header, so it must never
 * run in the browser (the `server-only` import enforces that at build time).
 * The web app does all reads in server components and all writes in server
 * actions, so the demo-user header never reaches the client.
 *
 * API_BASE already includes the `/api` prefix; callers pass only the resource
 * path (e.g. `/transactions`).
 */

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    /** Zod flatten()-style issues when the API returns a 400 validation error. */
    public issues?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  body?: unknown;
  /** Zod schema to parse the JSON response against. Omit for empty responses. */
  schema?: z.ZodTypeAny;
  /** Next.js fetch cache hint. Reads default to no-store so the UI is live. */
  cache?: RequestCache;
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, schema, cache = 'no-store' } = options;

  const res = await fetch(`${API_BASE}${path}`, {
    method,
    cache,
    headers: {
      'content-type': 'application/json',
      'x-user-id': DEMO_USER_ID,
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  if (!res.ok) {
    let payload: unknown;
    try {
      payload = await res.json();
    } catch {
      payload = undefined;
    }
    const message =
      (payload as { error?: string } | undefined)?.error ??
      `${method} ${path} failed (${res.status})`;
    throw new ApiError(res.status, message, (payload as { issues?: unknown } | undefined)?.issues);
  }

  if (res.status === 204) return undefined as T;

  const json = (await res.json()) as unknown;
  return (schema ? schema.parse(json) : json) as T;
}

export const api = {
  get: <T>(path: string, schema?: z.ZodTypeAny, cache?: RequestCache) =>
    request<T>(path, { method: 'GET', schema, cache }),
  post: <T>(path: string, body: unknown, schema?: z.ZodTypeAny) =>
    request<T>(path, { method: 'POST', body, schema }),
  patch: <T>(path: string, body: unknown, schema?: z.ZodTypeAny) =>
    request<T>(path, { method: 'PATCH', body, schema }),
  delete: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
};
