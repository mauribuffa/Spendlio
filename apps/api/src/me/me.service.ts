import { Inject, Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { users } from '@spendlio/db';
import type { DB as Database } from '@spendlio/db';
import type { UpdateUserInput, CompleteOnboardingInput } from '@spendlio/contracts';
import { DB } from '../db/db.module';
import { or404 } from '../common/or404';

@Injectable()
export class MeService {
  constructor(@Inject(DB) private db: Database) {}

  async get(userId: string) {
    const [row] = await this.db.select().from(users).where(eq(users.id, userId));
    return or404(row);
  }

  async update(userId: string, dto: UpdateUserInput) {
    const [row] = await this.db
      .update(users)
      .set({ ...dto, updatedAt: new Date() })
      .where(eq(users.id, userId))
      .returning();
    return or404(row);
  }

  /** One-time onboarding (ADR-038): persist base currency + language and mark
   *  the user onboarded. Idempotent — re-running just re-stamps the values. */
  async completeOnboarding(userId: string, dto: CompleteOnboardingInput) {
    const now = new Date();
    const [row] = await this.db
      .update(users)
      .set({ ...dto, onboardedAt: now, updatedAt: now })
      .where(eq(users.id, userId))
      .returning();
    return or404(row);
  }
}
