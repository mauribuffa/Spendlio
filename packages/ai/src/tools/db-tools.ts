import { and, desc, eq, gte, ilike, inArray, isNull, lt, lte, or, sql } from 'drizzle-orm';
import {
  accounts,
  budgets,
  people,
  settlements,
  splits,
  splitShares,
  transactions,
  users,
  type DB,
} from '@spendlio/db';
import { CategoryKey } from '@spendlio/contracts';
import { netBalances as coreNetBalances, computeRecap, type RecapResult } from '@spendlio/core';
import type {
  AccountBalanceLine,
  AssistantTools,
  BalanceLine,
  BudgetLine,
  CategorySpend,
  MonthlyRecap,
  MonthSpend,
  PersonBalanceDetail,
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

/** Midnight UTC of a YYYY-MM-DD day. */
export function dayStartUTC(date: string): Date {
  return new Date(`${date}T00:00:00.000Z`);
}
/** Midnight UTC of the day AFTER a YYYY-MM-DD day — the end-exclusive bound for an inclusive `to`. */
export function dayAfterUTC(date: string): Date {
  return new Date(dayStartUTC(date).getTime() + 86_400_000);
}

/** Inclusive list of YYYY-MM between two months, capped. */
export function monthsInRange(fromMonth: string, toMonth: string, cap = 24): string[] {
  const [fy, fm] = fromMonth.split('-').map(Number);
  const [ty, tm] = toMonth.split('-').map(Number);
  const out: string[] = [];
  let y = fy!;
  let m = fm!;
  while ((y < ty! || (y === ty! && m <= tm!)) && out.length < cap) {
    out.push(`${y}-${String(m).padStart(2, '0')}`);
    m += 1;
    if (m > 12) { m = 1; y += 1; }
  }
  return out;
}

/** Bucket flat (month, category, amount) rows into MonthSpend[], one entry per month in `months`. */
export function shapeTrend(
  months: string[],
  rows: { month: string; category: string; amountCents: number }[],
): MonthSpend[] {
  const byMonth = new Map<string, CategorySpend[]>(months.map((m) => [m, []]));
  for (const r of rows) {
    const list = byMonth.get(r.month);
    if (list) list.push({ category: r.category as CategoryKey, amountCents: r.amountCents });
  }
  return months.map((month) => {
    const byCategory = (byMonth.get(month) ?? []).sort((a, b) => b.amountCents - a.amountCents);
    return { month, totalCents: byCategory.reduce((s, c) => s + c.amountCents, 0), byCategory };
  });
}

/** Map a core RecapResult to the MonthlyRecap tool shape. */
export function toMonthlyRecap(month: string, r: RecapResult): MonthlyRecap {
  return {
    month,
    incomeCents: r.totalIncome,
    expenseCents: r.totalExpense,
    netCents: r.net,
    byCategory: r.byCategory.map((c) => ({ category: c.category, amountCents: c.amount })),
    topMerchant: r.topMerchant,
  };
}

/** Group account lines into per-currency subtotals (insertion order preserved). */
export function subtotalByCurrency(lines: AccountBalanceLine[]): { currency: string; totalCents: number }[] {
  const totals = new Map<string, number>();
  for (const l of lines) totals.set(l.currency, (totals.get(l.currency) ?? 0) + l.balanceCents);
  return [...totals.entries()].map(([currency, totalCents]) => ({ currency, totalCents }));
}

/** Map a transactions row to the RecentTransaction contract shape. */
function toRecentTransaction(r: {
  id: string; title: string; merchant: string | null; amount: number | string;
  currency: string; category: string; occurredAt: Date;
}): RecentTransaction {
  return {
    id: r.id,
    title: r.title,
    merchant: r.merchant ?? undefined,
    amountCents: Number(r.amount),
    currency: r.currency,
    category: r.category as CategoryKey,
    occurredAt: r.occurredAt.toISOString(),
  };
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
 * Net per-person balances (exact integer cents) from the user's viewpoint.
 * Thin adapter over `@spendlio/core`'s `netBalances` — the SINGLE source of
 * balance truth shared with `SplitsService.balances()`, so the assistant and the
 * Split page can never disagree. Maps each share to its split's currency and
 * forwards self-relative settlements (model B — ADR-028/039); a null `selfId`
 * (no self-person yet) yields empty maps.
 *
 * `splitRows` carries each split's currency so shares inherit it.
 */
export function netBalances(
  splitRows: SplitRow[],
  shareRows: ShareRow[],
  settlementRows: SettlementRow[],
  selfId: string | null,
): { net: Map<string, number>; currency: Map<string, string> } {
  if (!selfId) return { net: new Map(), currency: new Map() };
  const currencyOf = new Map(splitRows.map((s) => [s.id, s.currency]));
  const shares = shareRows.map((sh) => ({
    personId: sh.personId,
    amount: sh.amount,
    currency: currencyOf.get(sh.splitId) ?? 'USD',
  }));
  return coreNetBalances(shares, settlementRows, selfId);
}

/** Resolve a free-text name to one of the user's people: exact (ci) wins, else first substring hit. */
export function matchPerson<T extends { name: string }>(people: T[], query: string): T | null {
  const q = query.trim().toLowerCase();
  if (!q) return null;
  const exact = people.find((p) => p.name.toLowerCase() === q);
  if (exact) return exact;
  return people.find((p) => p.name.toLowerCase().includes(q)) ?? null;
}

/** Load everything netBalances needs for a user: selfId, splits, shares, settled settlements. */
async function loadBalanceInputs(db: DB, userId: string) {
  const [self] = await db
    .select({ id: people.id })
    .from(people)
    .where(and(eq(people.userId, userId), eq(people.isSelf, true)))
    .limit(1);
  const selfId = self?.id ?? null;

  const userSplits = await db
    .select({ id: splits.id, currency: splits.currency })
    .from(splits)
    .where(and(eq(splits.userId, userId), isNull(splits.deletedAt)));
  const splitIds = userSplits.map((s) => s.id);

  const shares = splitIds.length
    ? await db
        .select({ splitId: splitShares.splitId, personId: splitShares.personId, amount: splitShares.amount })
        .from(splitShares)
        .where(inArray(splitShares.splitId, splitIds))
    : [];

  const settled = await db
    .select({
      fromPersonId: settlements.fromPersonId,
      toPersonId: settlements.toPersonId,
      amount: settlements.amount,
      currency: settlements.currency,
      settledAt: settlements.settledAt,
    })
    .from(settlements)
    .where(and(eq(settlements.userId, userId), eq(settlements.status, 'settled')));

  return { selfId, userSplits, shares, settled };
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

      return rows.map(toRecentTransaction);
    },

    async balancesSummary(): Promise<BalanceLine[]> {
      const { selfId, userSplits, shares, settled } = await loadBalanceInputs(db, userId);

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
        selfId,
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

    async balanceWithPerson(query): Promise<PersonBalanceDetail | null> {
      const userPeople = await db
        .select({ id: people.id, name: people.name, isSelf: people.isSelf })
        .from(people)
        .where(and(eq(people.userId, userId), eq(people.isSelf, false)));
      const match = matchPerson(userPeople, query);
      if (!match) return null;

      const { selfId, userSplits, shares, settled } = await loadBalanceInputs(db, userId);
      const { net, currency } = netBalances(
        userSplits.map((s) => ({ id: s.id, currency: s.currency })),
        shares.map((sh) => ({ splitId: sh.splitId, personId: sh.personId, amount: Number(sh.amount) })),
        settled.map((st) => ({
          fromPersonId: st.fromPersonId,
          toPersonId: st.toPersonId,
          amount: Number(st.amount),
          currency: st.currency,
        })),
        selfId,
      );

      const currencyOf = new Map(userSplits.map((s) => [s.id, s.currency]));
      const personShares = shares
        .filter((sh) => sh.personId === match.id)
        .map((sh) => ({ amountCents: Number(sh.amount), currency: currencyOf.get(sh.splitId) ?? 'USD' }));
      const personSettlements = settled
        .filter((st) => st.fromPersonId === match.id || st.toPersonId === match.id)
        .map((st) => ({
          amountCents: Number(st.amount),
          // from=match → the friend paid you; to=match → you paid them.
          direction: (st.fromPersonId === match.id ? 'they_paid_you' : 'you_paid_them') as
            | 'they_paid_you'
            | 'you_paid_them',
          currency: st.currency,
          settledAt: st.settledAt ? st.settledAt.toISOString() : null,
        }));

      return {
        personName: match.name,
        netCents: net.get(match.id) ?? 0,
        currency: currency.get(match.id) ?? 'USD',
        shares: personShares,
        settlements: personSettlements,
      };
    },

    async searchTransactions(filter): Promise<RecentTransaction[]> {
      const conds = [eq(transactions.userId, userId), isNull(transactions.deletedAt)];
      if (filter.text) {
        const q = `%${filter.text}%`;
        conds.push(
          or(ilike(transactions.title, q), ilike(transactions.merchant, q), ilike(transactions.note, q))!,
        );
      }
      if (filter.categories?.length) conds.push(inArray(transactions.category, filter.categories));
      if (filter.minCents != null) conds.push(gte(sql`abs(${transactions.amount})`, filter.minCents));
      if (filter.maxCents != null) conds.push(lte(sql`abs(${transactions.amount})`, filter.maxCents));
      if (filter.from) conds.push(gte(transactions.occurredAt, dayStartUTC(filter.from)));
      if (filter.to) conds.push(lt(transactions.occurredAt, dayAfterUTC(filter.to)));
      if (filter.status) conds.push(eq(transactions.status, filter.status));

      const limit = Math.max(1, Math.min(50, filter.limit ?? 20));
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
        .where(and(...conds))
        .orderBy(desc(transactions.occurredAt))
        .limit(limit);

      return rows.map(toRecentTransaction);
    },

    async spendingTrend({ categories, fromMonth, toMonth }): Promise<MonthSpend[]> {
      const months = monthsInRange(fromMonth, toMonth);
      if (months.length === 0) return [];
      const start = monthBounds(months[0]!).start;
      const end = monthBounds(months[months.length - 1]!).end;
      const cats = categories?.length ? categories : EXPENSE_CATEGORIES;
      const monthExpr = sql<string>`to_char(${transactions.occurredAt} at time zone 'UTC', 'YYYY-MM')`;
      const rows = await db
        .select({
          month: monthExpr,
          category: transactions.category,
          amountCents: sql<number>`coalesce(sum(abs(${transactions.amount})), 0)::bigint`,
        })
        .from(transactions)
        .where(
          and(
            eq(transactions.userId, userId),
            isNull(transactions.deletedAt),
            inArray(transactions.category, cats),
            gte(transactions.occurredAt, start),
            lt(transactions.occurredAt, end),
          ),
        )
        .groupBy(monthExpr, transactions.category);

      return shapeTrend(
        months,
        rows.map((r) => ({ month: r.month, category: r.category, amountCents: Number(r.amountCents) })),
      );
    },

    async monthlyRecap(month): Promise<MonthlyRecap> {
      const { start, end } = monthBounds(month);
      const [user] = await db
        .select({ baseCurrency: users.defaultCurrency })
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);
      const baseCurrency = user?.baseCurrency ?? 'USD';

      const rows = await db
        .select({
          amount: transactions.amount,
          currency: transactions.currency,
          category: transactions.category,
          merchant: transactions.merchant,
          fxBaseAmount: transactions.fxBaseAmount,
        })
        .from(transactions)
        .where(
          and(
            eq(transactions.userId, userId),
            isNull(transactions.deletedAt),
            gte(transactions.occurredAt, start),
            lt(transactions.occurredAt, end),
          ),
        );

      const recapTxns = rows.map((r) => ({
        amount: Number(r.amount),
        currency: r.currency,
        category: r.category as CategoryKey,
        merchant: r.merchant,
        fxBaseAmount: r.fxBaseAmount == null ? null : Number(r.fxBaseAmount),
      }));
      return toMonthlyRecap(month, computeRecap(recapTxns, baseCurrency));
    },

    async accountBalances(): Promise<AccountBalanceLine[]> {
      // An account balance is the signed sum of ALL its postings (transfers included) —
      // intentionally unlike the spend tools, which exclude income/transfer.
      const accts = await db
        .select({ id: accounts.id, name: accounts.name, currency: accounts.currency })
        .from(accounts)
        .where(eq(accounts.userId, userId));
      if (accts.length === 0) return [];

      const sums = await db
        .select({
          accountId: transactions.accountId,
          total: sql<number>`coalesce(sum(${transactions.amount}), 0)::bigint`,
        })
        .from(transactions)
        .where(and(eq(transactions.userId, userId), isNull(transactions.deletedAt)))
        .groupBy(transactions.accountId);
      const totalOf = new Map(sums.map((s) => [s.accountId, Number(s.total)]));

      return accts.map((a) => ({
        accountName: a.name,
        currency: a.currency,
        balanceCents: totalOf.get(a.id) ?? 0,
      }));
    },
  };
}
