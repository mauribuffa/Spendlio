import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { and, desc, eq, gte, isNull, lt, sql } from 'drizzle-orm';
import { budgets, transactions } from '@spendlio/db';
import type { BudgetStatus, CreateBudgetInput, UpdateBudgetInput } from '@spendlio/contracts';
import { DB } from '../db/db.module';
import { periodBounds } from './period';

@Injectable()
export class BudgetsService {
  constructor(@Inject(DB) private db: any) {}

  async list(userId: string) {
    const items = await this.db.select().from(budgets)
      .where(eq(budgets.userId, userId))
      .orderBy(desc(budgets.createdAt));
    return { items, nextCursor: null };
  }

  async create(userId: string, dto: CreateBudgetInput) {
    const [row] = await this.db.insert(budgets).values({ ...dto, userId }).returning();
    return row;
  }

  async get(userId: string, id: string) {
    const [row] = await this.db.select().from(budgets)
      .where(and(eq(budgets.id, id), eq(budgets.userId, userId)));
    if (!row) throw new NotFoundException();
    return row;
  }

  async update(userId: string, id: string, dto: UpdateBudgetInput) {
    await this.get(userId, id);
    const [row] = await this.db.update(budgets)
      .set({ ...dto, updatedAt: new Date() })
      .where(and(eq(budgets.id, id), eq(budgets.userId, userId)))
      .returning();
    return row;
  }

  async remove(userId: string, id: string) {
    await this.get(userId, id);
    await this.db.delete(budgets).where(and(eq(budgets.id, id), eq(budgets.userId, userId)));
    return { ok: true };
  }

  /**
   * Budget status for the active period: spent is the magnitude of expenses
   * (negative amounts) in this user's transactions for the budget's category,
   * within the current period window. remaining/pct are derived.
   */
  async status(userId: string): Promise<BudgetStatus[]> {
    const rows = await this.db.select().from(budgets).where(eq(budgets.userId, userId));
    const out: BudgetStatus[] = [];
    for (const b of rows) {
      const { start, end } = periodBounds(b.period);
      // sum of expense magnitudes (amount < 0) for this category in the window
      const [agg] = await this.db
        .select({ spent: sql<number>`coalesce(-sum(${transactions.amount}), 0)` })
        .from(transactions)
        .where(and(
          eq(transactions.userId, userId),
          eq(transactions.category, b.category),
          isNull(transactions.deletedAt),
          gte(transactions.occurredAt, start),
          lt(transactions.occurredAt, end),
          lt(transactions.amount, 0),
        ));
      const spent = Number(agg?.spent ?? 0);
      const remaining = b.limit - spent;
      const pct = b.limit === 0 ? 0 : spent / b.limit;
      out.push({
        category: b.category,
        period: b.period,
        currency: b.currency,
        limit: b.limit,
        spent,
        remaining,
        pct,
      });
    }
    return out;
  }
}
