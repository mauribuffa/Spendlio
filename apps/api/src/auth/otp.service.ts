import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { createHmac, randomInt, timingSafeEqual } from 'node:crypto';
import { eq } from 'drizzle-orm';
import { users } from '@spendlio/db';
import { getRedisClient } from '@spendlio/queue';
import type { AuthUser } from '@spendlio/contracts';
import { DB } from '../db/db.module';
import { EMAIL_SENDER, type EmailSender } from './email/email-sender';

const TTL_SECONDS = 600; // 10 min
const COOLDOWN_SECONDS = 60; // resend cooldown
const MAX_ATTEMPTS = 5;

function secret(): string {
  return process.env.API_JWT_SECRET ?? 'change-me-dev-only';
}
/** HMAC the code so a casual Redis read can't reveal it to re-email. The real
 *  protection is the attempt-limit + TTL + single-use. */
function hashCode(code: string): string {
  return createHmac('sha256', secret()).update(code).digest('hex');
}
function key(email: string): string {
  return `otp:${email.toLowerCase()}`;
}
function cooldownKey(email: string): string {
  return `otp:cooldown:${email.toLowerCase()}`;
}

@Injectable()
export class OtpService {
  constructor(
    @Inject(DB) private db: any,
    @Inject(EMAIL_SENDER) private email: EmailSender,
  ) {}

  /** Generate + store + email a code. Returns the code only in non-prod. */
  async request(email: string): Promise<{ devCode?: string }> {
    const redis = getRedisClient();
    // Resend cooldown: silently no-op (caller still returns 200) if sent recently.
    if (await redis.get(cooldownKey(email))) return {};

    const code = String(randomInt(0, 1_000_000)).padStart(6, '0');
    await redis.set(
      key(email),
      JSON.stringify({ codeHash: hashCode(code), attempts: 0 }),
      'EX',
      TTL_SECONDS,
    );
    await redis.set(cooldownKey(email), '1', 'EX', COOLDOWN_SECONDS);
    await this.email.sendOtpCode(email, code);
    return process.env.NODE_ENV !== 'production' ? { devCode: code } : {};
  }

  /** Verify a code; on success provision the user and return it. */
  async verify(email: string, code: string): Promise<AuthUser> {
    const redis = getRedisClient();
    const raw = await redis.get(key(email));
    if (!raw) throw new UnauthorizedException('Code expired or not found.');
    const { codeHash, attempts } = JSON.parse(raw) as { codeHash: string; attempts: number };

    const a = Buffer.from(hashCode(code), 'hex');
    const b = Buffer.from(codeHash, 'hex');
    const matches = a.length === b.length && timingSafeEqual(a, b);
    if (!matches) {
      const next = attempts + 1;
      if (next >= MAX_ATTEMPTS) await redis.del(key(email));
      else await redis.set(key(email), JSON.stringify({ codeHash, attempts: next }), 'KEEPTTL');
      throw new UnauthorizedException('Incorrect code.');
    }

    await redis.del(key(email)); // single-use
    await redis.del(cooldownKey(email));
    return this.provision(email);
  }

  /** Upsert a user keyed on the unique email (first sign-in = account creation). */
  private async provision(email: string): Promise<AuthUser> {
    const lower = email.toLowerCase();
    const name = lower.split('@')[0];
    await this.db
      .insert(users)
      .values({ email: lower, name })
      .onConflictDoNothing({ target: users.email });
    const [row] = await this.db.select().from(users).where(eq(users.email, lower));
    return { id: row.id, email: row.email, name: row.name };
  }
}
