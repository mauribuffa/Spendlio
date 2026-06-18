import { CanActivate, ExecutionContext, HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { getRedisClient } from '@spendlio/queue';
import { ASSISTANT_RATE_LIMIT, isOverLimit, rateLimitKey } from './rate-limit';

/**
 * Per-user fixed-window rate limit for the assistant. Runs AFTER AuthGuard, so
 * `request.user.id` is set. Bounds live-provider token cost / abuse. Uses the
 * shared Redis (same client the OTP service uses); INCR + EXPIRE is atomic enough
 * for a coarse window.
 */
@Injectable()
export class RateLimitGuard implements CanActivate {
  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const req = ctx.switchToHttp().getRequest<{ user?: { id: string } }>();
    const userId = req.user?.id;
    if (!userId) return true; // AuthGuard handles unauthenticated; nothing to scope by here.

    const redis = getRedisClient();
    const key = rateLimitKey(userId, Date.now());
    const count = await redis.incr(key);
    if (count === 1) await redis.expire(key, ASSISTANT_RATE_LIMIT.windowSec);
    if (isOverLimit(count)) {
      throw new HttpException('Too many requests — please slow down.', HttpStatus.TOO_MANY_REQUESTS);
    }
    return true;
  }
}
