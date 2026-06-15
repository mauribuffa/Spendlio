import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { and, desc, eq } from 'drizzle-orm';
import { accounts } from '@spendlio/db';
import type { CreateAccountInput, UpdateAccountInput } from '@spendlio/contracts';
import { DB } from '../db/db.module';

@Injectable()
export class AccountsService {
  constructor(@Inject(DB) private db: any) {}

  async list(userId: string) {
    const items = await this.db.select().from(accounts)
      .where(eq(accounts.userId, userId))
      .orderBy(desc(accounts.createdAt));
    return { items, nextCursor: null };
  }

  async create(userId: string, dto: CreateAccountInput) {
    const [row] = await this.db.insert(accounts).values({ ...dto, userId }).returning();
    return row;
  }

  async get(userId: string, id: string) {
    const [row] = await this.db.select().from(accounts)
      .where(and(eq(accounts.id, id), eq(accounts.userId, userId)));
    if (!row) throw new NotFoundException();
    return row;
  }

  async update(userId: string, id: string, dto: UpdateAccountInput) {
    await this.get(userId, id);
    const [row] = await this.db.update(accounts)
      .set({ ...dto, updatedAt: new Date() })
      .where(and(eq(accounts.id, id), eq(accounts.userId, userId)))
      .returning();
    return row;
  }

  async remove(userId: string, id: string) {
    await this.get(userId, id);
    await this.db.update(accounts).set({ archivedAt: new Date(), updatedAt: new Date() })
      .where(and(eq(accounts.id, id), eq(accounts.userId, userId)));
    return { ok: true };
  }
}
