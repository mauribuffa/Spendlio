/** Fixed-window rate-limit policy for the assistant endpoint. */
export const ASSISTANT_RATE_LIMIT = { max: 30, windowSec: 60 } as const;

/** The Redis key for a user's current fixed window. `nowMs` is injectable for clarity/testing. */
export function rateLimitKey(userId: string, nowMs: number, windowSec = ASSISTANT_RATE_LIMIT.windowSec): string {
  const bucket = Math.floor(nowMs / 1000 / windowSec);
  return `assistant:rl:${userId}:${bucket}`;
}

/** Whether a freshly-incremented counter has exceeded the window allowance. */
export function isOverLimit(count: number, max = ASSISTANT_RATE_LIMIT.max): boolean {
  return count > max;
}
