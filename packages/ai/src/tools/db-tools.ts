import { and, desc, eq, gte, inArray, isNull, lt, sql } from 'drizzle-orm';
import {
  budgets,
  people,
  settlements,
  splits,
  splitShares,
  transactions,
  type DB,
} from '@spendlio/db';
import { CategoryKey } from '@spendlio/contracts';
import type {
  AssistantTools,
  BalanceLine,
  BudgetLine,
  CategorySpend,
  RecentTransaction,
} from '../provider';

/** Categories that count as spending (everything except income/transfer). */
const EXPENSE_CATEGORIES: CategoryKey[] = CategoryKey.options.filter(
  (c) => c !== 'income' && c !== 'transfer',
);

/** UTC [start, end) bounds for a `YYYY-MM` month string. */
export function monthBounds(month: string): { start: Date; end: Date } {
  const [y, m] = month.split('-').map(Number);
  const start = new Date(Date.UTC(y!, m! - 1, 1));
  const end = new Date(Date.UTC(y!, m!, 1)); // first day of the next month
  return { start, end };
}

/** The `YYYY-MM` of a date, in UTC. */
export function monthOf(date: Date): string {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
}

// ---- Pure helpers (unit-tested offline; the Drizzle glue below is thin) ----

export interface SplitRow {
  id: string;
  currency: string;
}
export interface ShareRow {
  splitId: string;
  personId: string;
  amount: number;
}
export interface SettlementRow {
  fromPersonId: string;
  toPersonId: string;
  amount: number;
  currency: string;
}

/**
 * Net per-person balances (exact integer cents) from the user's viewpoint
 * (ADR-021 model B: the user is the implicit payer/creditor of their own splits;
 * there is no self-person row). Pure — the SQL layer just feeds it rows. Direct
 * per-person aggregation:
 *   - each split_share `personId` owes you their `amount`  (+)
 *   - a person who has SETTLED a settlement reduces their debt by `amount`  (−)
 * Returns Map<personId, netCents> (positive = they owe you, negative = you owe
 * them), zero balances dropped, plus the per-person currency.
 *
 * `splitRows` carries each split's currency so shares inherit it.
 * Mixed-payer / "a friend paid" splits need a self-person row + bidirectional
 * netting — out of scope here (ADR-021 follow-up).
 */
export function netBalances(
  splitRows: SplitRow[],
  shareRows: ShareRow[],
  settlementRows: SettlementRow[],
): { net: Map<string, number>; currency: Map<string, string> } {
  const currencyOf = new Map(splitRows.map((s) => [s.id, s.currency]));
  const net = new Map<string, number>();
  const personCurrency = new Map<string, string>();
  const bump = (id: string, d: number) => net.set(id, (net.get(id) ?? 0) + d);

  // Each share is a person owing the user their portion.
  for (const sh of shareRows) {
    bump(sh.personId, sh.amount);
    const cur = currencyOf.get(sh.splitId);
    if (cur) personCurrency.set(sh.personId, cur);
  }
  // A settled settlement: the person who paid it (fromPersonId) reduces their debt.
  for (const st of settlementRows) {
    bump(st.fromPersonId, -st.amount);
    if (!personCurrency.has(st.fromPersonId)) personCurrency.set(st.fromPersonId, st.currency);
  }

  // Drop zero balances.
  for (const [id, v] of net) if (v === 0) net.delete(id);
  return { net, currency: personCurrency };
}

/**
 * Build the assistant's typed tools backed by the live DB. EVERY query is scoped
 * to `userId` (Golden Rule 4), and EVERY money value returned is an exact integer
 * cent computed in SQL/core — the model only narrates, never computes money.
 */
export function createDbTools(db: DB, userId: string): AssistantTools {
  return {
    async spendByCategory(month: string): Promise<CategorySpend[]> {
      const { start, end } = monthBounds(month);
      // Sum absolute amounts per category for expense categories, user-scoped,
      // excluding soft-deleted rows. abs() makes the sign convention irrelevant.
      const rows = await db
        .select({
          category: transactions.category,
          amountCents: sql<number>`coalesce(sum(abs(${transactions.amount})), 0)::bigint`,
        })
        .from(transactions)
        .where(
          and(
            eq(transactions.userId, userId),
            isNull(transactions.deletedAt),
            inArray(transactions.category, EXPENSE_CATEGORIES),
            gte(transactions.occurredAt, start),
            lt(transactions.occurredAt, end),
          ),
        )
        .groupBy(transactions.category);

      return rows
        .map((r) => ({ category: r.category as CategoryKey, amountCents: Number(r.amountCents) }))
        .filter((r) => CategoryKey.safeParse(r.category).success);
    },

    async budgetStatus(): Promise<BudgetLine[]> {
      // Budgets for this user (monthly period assumed) ...
      const userBudgets = await db
        .select({
          category: budgets.category,
          limitCents: budgets.limit,
        })
        .from(budgets)
        .where(eq(budgets.userId, userId));

      if (userBudgets.length === 0) return [];

      // ... vs current-month actual spend per category.
      const month = monthOf(new Date());
      const spend = await this.spendByCategory(month);
      const spentByCat = new Map(spend.map((s) => [s.category, s.amountCents]));

      return userBudgets.map((b) => {
        const limitCents = Number(b.limitCents);
        const spentCents = spentByCat.get(b.category as CategoryKey) ?? 0;
        return {
          category: b.category as CategoryKey,
          limitCents,
          spentCents,
          remainingCents: limitCents - spentCents,
        };
      });
    },

    async recentTransactions(limit: number): Promise<RecentTransaction[]> {
      const rows = await db
        .select({
          id: transactions.id,
          title: transactions.title,
          merchant: transactions.merchant,
          amount: transactions.amount,
          currency: transactions.currency,
          category: transactions.category,
          occurredAt: transactions.occurredAt,
        })
        .from(transactions)
        .where(and(eq(transactions.userId, userId), isNull(transactions.deletedAt)))
        .orderBy(desc(transactions.occurredAt))
        .limit(Math.max(1, Math.min(50, limit)));

      return rows.map((r) => ({
        id: r.id,
        title: r.title,
        merchant: r.merchant ?? undefined,
        amountCents: Number(r.amount),
        currency: r.currency,
        category: r.category as CategoryKey,
        occurredAt: r.occurredAt.toISOString(),
      }));
    },

    async balancesSummary(): Promise<BalanceLine[]> {
      // Pull this user's splits, their per-person shares, and settled settlements.
      const userSplits = await db
        .select({ id: splits.id, currency: splits.currency })
        .from(splits)
        .where(and(eq(splits.userId, userId), isNull(splits.deletedAt)));

      const splitIds = userSplits.map((s) => s.id);
      const shares = splitIds.length
        ? await db
            .select({
              splitId: splitShares.splitId,
              personId: splitShares.personId,
              amount: splitShares.amount,
            })
            .from(splitShares)
            .where(inArray(splitShares.splitId, splitIds))
        : [];

      const settled = await db
        .select({
          fromPersonId: settlements.fromPersonId,
          toPersonId: settlements.toPersonId,
          amount: settlements.amount,
          currency: settlements.currency,
        })
        .from(settlements)
        .where(and(eq(settlements.userId, userId), eq(settlements.status, 'settled')));

      // Net per person (pure, exact integer cents).
      const { net, currency: personCurrency } = netBalances(
        userSplits.map((s) => ({ id: s.id, currency: s.currency })),
        shares.map((sh) => ({ splitId: sh.splitId, personId: sh.personId, amount: Number(sh.amount) })),
        settled.map((st) => ({
          fromPersonId: st.fromPersonId,
          toPersonId: st.toPersonId,
          amount: Number(st.amount),
          currency: st.currency,
        })),
      );

      // Resolve names; anyone not in this user's people is dropped.
      const personIds = [...net.keys()];
      if (personIds.length === 0) return [];
      const persons = await db
        .select({ id: people.id, name: people.name })
        .from(people)
        .where(and(eq(people.userId, userId), inArray(people.id, personIds)));
      const nameOf = new Map(persons.map((p) => [p.id, p.name]));

      const result: BalanceLine[] = [];
      for (const id of personIds) {
        const name = nameOf.get(id);
        if (!name) continue; // not one of this user's people
        result.push({
          personName: name,
          netCents: net.get(id)!,
          currency: personCurrency.get(id) ?? 'USD',
        });
      }
      return result;
    },
  };
}
