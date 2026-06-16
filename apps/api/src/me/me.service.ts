import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { users } from '@spendlio/db';
import type { UpdateUserInput } from '@spendlio/contracts';
import { DB } from '../db/db.module';

@Injectable()
export class MeService {
  constructor(@Inject(DB) private db: any) {}

  async get(userId: string) {
    const [row] = await this.db.select().from(users).where(eq(users.id, userId));
    if (!row) throw new NotFoundException();
    return row;
  }

  async update(userId: string, dto: UpdateUserInput) {
    const [row] = await this.db
      .update(users)
      .set({ ...dto, updatedAt: new Date() })
      .where(eq(users.id, userId))
      .returning();
    if (!row) throw new NotFoundException();
    return row;
  }
}
