import { Inject, Injectable } from '@nestjs/common';
import { asc, eq, isNull, or } from 'drizzle-orm';
import { categories } from '@spendlio/db';
import type { DB as Database } from '@spendlio/db';
import { DB } from '../db/db.module';

@Injectable()
export class CategoriesService {
  constructor(@Inject(DB) private db: Database) {}

  /** Built-in defaults (userId IS NULL, shared by all) plus this user's own categories. */
  async list(userId: string) {
    const items = await this.db.select().from(categories)
      .where(or(isNull(categories.userId), eq(categories.userId, userId)))
      .orderBy(asc(categories.label));
    return { items, nextCursor: null };
  }
}
