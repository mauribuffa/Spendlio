import { Inject, Injectable } from '@nestjs/common';
import { and, desc, eq, gte, isNull, lt } from 'drizzle-orm';
import { budgets, transactions } from '@spendlio/db';
import type { DB as Database } from '@spendlio/db';
import type { BudgetStatus, BudgetPeriod, CategoryKey, CreateBudgetInput, UpdateBudgetInput } from '@spendlio/contracts';
import { DB } from '../db/db.module';
import { periodBounds } from './period';
import { or404 } from '../common/or404';

@Injectable()
export class BudgetsService {
  constructor(@Inject(DB) private db: Database) {}

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
    return or404(row);
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
    if (rows.length === 0) return [];

    // Per-budget period window, then the union [minStart, maxEnd) covering them all.
    const windows = rows.map((b) => ({ b, ...periodBounds(b.period as BudgetPeriod) }));
    let minStart = windows[0]!.start;
    let maxEnd = windows[0]!.end;
    for (const w of windows) {
      if (w.start < minStart) minStart = w.start;
      if (w.end > maxEnd) maxEnd = w.end;
    }

    // One query: this user's expenses (amount < 0) across the union window.
    const txns = await this.db
      .select({
        category: transactions.category,
        amount: transactions.amount,
        occurredAt: transactions.occurredAt,
      })
      .from(transactions)
      .where(and(
        eq(transactions.userId, userId),
        isNull(transactions.deletedAt),
        gte(transactions.occurredAt, minStart),
        lt(transactions.occurredAt, maxEnd),
        lt(transactions.amount, 0),
      ));

    return windows.map(({ b, start, end }): BudgetStatus => {
      // sum of expense magnitudes (amount < 0) for this category in the window
      let sum = 0;
      for (const t of txns) {
        if (t.category === b.category && t.occurredAt >= start && t.occurredAt < end) {
          sum += t.amount;
        }
      }
      const spent = -sum;
      const remaining = b.limit - spent;
      const pct = b.limit === 0 ? 0 : spent / b.limit;
      return {
        category: b.category as CategoryKey,
        period: b.period as BudgetPeriod,
        currency: b.currency,
        limit: b.limit,
        spent,
        remaining,
        pct,
      };
    });
  }
}
