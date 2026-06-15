import 'server-only';

/**
 * Run a data loader, returning a fallback (and the error) instead of throwing.
 *
 * The web app talks to a separate API process; until that process is running
 * and seeded, reads will fail. Pages use this so the shell + empty states
 * still render (and tell the user the API is unreachable) rather than crashing
 * the route. When the API is live, the real data flows through unchanged.
 */
export async function safe<T>(
  loader: () => Promise<T>,
  fallback: T,
): Promise<{ data: T; error: string | null }> {
  try {
    return { data: await loader(), error: null };
  } catch (err) {
    const error = err instanceof Error ? err.message : 'Could not reach the API.';
    return { data: fallback, error };
  }
}
