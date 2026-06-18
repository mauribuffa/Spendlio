import { Inject, Injectable } from '@nestjs/common';
import { and, eq } from 'drizzle-orm';
import { monthlySummaries } from '@spendlio/db';
import type { DB as Database } from '@spendlio/db';
import { DB } from '../db/db.module';
import { or404 } from '../common/or404';

@Injectable()
export class RecapsService {
  constructor(@Inject(DB) private db: Database) {}

  /** The user's monthly_summaries row for a YYYY-MM month; 404 if not built yet. */
  async get(userId: string, month: string) {
    const [row] = await this.db
      .select()
      .from(monthlySummaries)
      .where(and(eq(monthlySummaries.userId, userId), eq(monthlySummaries.month, month)));
    return or404(row);
  }
}
