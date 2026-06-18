import type { Transaction } from '@/lib/resources';

export interface SpendingSummary {
  income: number;
  expense: number;
  net: number;
  currency: string;
  /** Expense by category, largest first. */
  categories: { category: string; value: number }[];
}

/**
 * Pure spending rollup over a transaction list (integer cents): income is the
 * sum of positive amounts, expense the magnitude of negatives, and `categories`
 * the expense-by-category breakdown sorted largest-first. Shared by the Overview
 * and Insights pages so the two views can't drift (app/ stays routing-only).
 */
export function summarizeSpending(items: Transaction[]): SpendingSummary {
  let income = 0;
  let expense = 0;
  const byCategory = new Map<string, number>();
  for (const item of items) {
    if (item.amount >= 0) income += item.amount;
    else {
      expense += -item.amount;
      byCategory.set(item.category, (byCategory.get(item.category) ?? 0) + -item.amount);
    }
  }
  const currency = items[0]?.currency ?? 'USD';
  const categories = [...byCategory.entries()]
    .map(([category, value]) => ({ category, value }))
    .sort((a, b) => b.value - a.value);
  return { income, expense, net: income - expense, currency, categories };
}
