import { Inject, Injectable } from '@nestjs/common';
import { desc, eq } from 'drizzle-orm';
import { people } from '@spendlio/db';
import type { CreatePersonInput } from '@spendlio/contracts';
import { DB } from '../db/db.module';

@Injectable()
export class PeopleService {
  constructor(@Inject(DB) private db: any) {}

  async list(userId: string) {
    const items = await this.db.select().from(people)
      .where(eq(people.userId, userId))
      .orderBy(desc(people.createdAt));
    return { items, nextCursor: null };
  }

  async create(userId: string, dto: CreatePersonInput) {
    const [row] = await this.db.insert(people).values({ ...dto, userId }).returning();
    return row;
  }
}
