import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { and, desc, eq, isNull, lt } from 'drizzle-orm';
import { accounts, transactions } from '@spendlio/db';
import type { CreateTransactionInput, UpdateTransactionInput } from '@spendlio/contracts';
import { DB } from '../db/db.module';
import { decodeCursor, encodeCursor } from '../common/pagination';

@Injectable()
export class TransactionsService {
  constructor(@Inject(DB) private db: any) {}

  /** IDOR guard: a supplied accountId must belong to this user before we link it. */
  private async assertAccountOwned(userId: string, accountId?: string | null) {
    if (!accountId) return;
    const [owned] = await this.db
      .select({ id: accounts.id })
      .from(accounts)
      .where(and(eq(accounts.id, accountId), eq(accounts.userId, userId)))
      .limit(1);
    if (!owned) throw new BadRequestException('That account does not belong to you.');
  }

  async list(userId: string, cursor?: string, limit = 20) {
    const c = decodeCursor(cursor);
    const rows = await this.db.select().from(transactions)
      .where(and(
        eq(transactions.userId, userId),
        isNull(transactions.deletedAt),
        c ? lt(transactions.occurredAt, new Date(c.occurredAt)) : undefined,
      ))
      .orderBy(desc(transactions.occurredAt), desc(transactions.id))
      .limit(limit + 1);
    const items = rows.slice(0, limit);
    const next = rows.length > limit
      ? encodeCursor({ occurredAt: items.at(-1)!.occurredAt.toISOString(), id: items.at(-1)!.id })
      : null;
    return { items, nextCursor: next };
  }

  async create(userId: string, dto: CreateTransactionInput) {
    await this.assertAccountOwned(userId, dto.accountId);
    // TODO: if dto.currency !== user's base, compute fx snapshot (see 12-currency-and-fx.md)
    const [row] = await this.db.insert(transactions)
      .values({ ...dto, userId, occurredAt: new Date(dto.occurredAt),
        category: dto.category ?? 'transfer', status: dto.status ?? 'cleared' })
      .returning();
    // TODO: if uncategorized, enqueue a 'categorize' job (Phase 4)
    return row;
  }

  async get(userId: string, id: string) {
    const [row] = await this.db.select().from(transactions)
      .where(and(eq(transactions.id, id), eq(transactions.userId, userId), isNull(transactions.deletedAt)));
    if (!row) throw new NotFoundException();
    return row;
  }

  async update(userId: string, id: string, dto: UpdateTransactionInput) {
    await this.get(userId, id); // ensures ownership
    await this.assertAccountOwned(userId, dto.accountId);
    const [row] = await this.db.update(transactions)
      .set({ ...dto, ...(dto.occurredAt ? { occurredAt: new Date(dto.occurredAt) } : {}), updatedAt: new Date() })
      .where(and(eq(transactions.id, id), eq(transactions.userId, userId)))
      .returning();
    return row;
  }

  async remove(userId: string, id: string) {
    await this.get(userId, id);
    await this.db.update(transactions).set({ deletedAt: new Date() })
      .where(and(eq(transactions.id, id), eq(transactions.userId, userId)));
    return { ok: true };
  }
}
