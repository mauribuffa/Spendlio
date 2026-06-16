/**
 * Single source of truth for how the web app reaches the API.
 *
 * API_URL is the API origin WITHOUT the `/api` prefix; the API client appends
 * `/api` + the resource path (e.g. `${API_URL}/api/transactions`). It is read
 * server-side only (server components + server actions + route handlers), so
 * the Bearer token (minted from the Auth.js session) is attached on the server
 * and never reaches the browser.
 */
export const API_URL = process.env.API_URL ?? 'http://localhost:4000';

/** Convenience: the API mounts everything under the `/api` global prefix. */
export const API_BASE = `${API_URL}/api`;

/** Dev-login only: the seeded demo user the dev Credentials provider signs in as (ADR-033). */
export const DEMO_USER_ID =
  process.env.DEMO_USER_ID ?? '00000000-0000-0000-0000-000000000001';
