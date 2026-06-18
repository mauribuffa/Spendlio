import type { CategoryKey } from '@spendlio/contracts';

/** Month names → 1-based month number, for parsing "May" out of a question. */
const MONTHS: Record<string, number> = {
  january: 1, february: 2, march: 3, april: 4, may: 5, june: 6,
  july: 7, august: 8, september: 9, october: 10, november: 11, december: 12,
};

/** The 12 category keys, matched as whole words in the question text. */
const CATEGORIES: CategoryKey[] = [
  'groceries', 'dining', 'transport', 'housing', 'utilities', 'shopping',
  'health', 'entertainment', 'travel', 'subscriptions', 'income', 'transfer',
];

export interface SpendIntent {
  kind: 'spendByCategory';
  category: CategoryKey;
  monthName: string; // "May"
  month: string; // "YYYY-05"
}

export type Intent =
  | SpendIntent
  | { kind: 'budgetStatus' }
  | { kind: 'recentTransactions' }
  | { kind: 'balancesSummary' }
  | { kind: 'search'; text: string }
  | { kind: 'trend'; category: CategoryKey | null }
  | { kind: 'recap'; month: string; monthName: string }
  | { kind: 'unknown' };

/** Find the first category keyword mentioned in the text. */
function findCategory(text: string): CategoryKey | null {
  for (const c of CATEGORIES) {
    if (new RegExp(`\\b${c}\\b`).test(text)) return c;
  }
  return null;
}

/** Find a month name + its `YYYY-MM` string, using the given current year. */
function findMonth(text: string, year: number): { name: string; month: string } | null {
  for (const [name, num] of Object.entries(MONTHS)) {
    if (new RegExp(`\\b${name}\\b`).test(text)) {
      return { name: name[0]!.toUpperCase() + name.slice(1), month: `${year}-${String(num).padStart(2, '0')}` };
    }
  }
  return null;
}

/**
 * Deterministic intent parser for the offline assistant. Maps a plain question
 * to one of the tool-backed intents, or `unknown`. `now` is injectable for tests.
 */
export function parseIntent(question: string, now: Date = new Date()): Intent {
  const text = question.toLowerCase();
  const year = now.getUTCFullYear();

  if (/\b(balance|owe|owes|owed|settle|settl)\w*/.test(text)) {
    return { kind: 'balancesSummary' };
  }
  if (/\bbudget/.test(text)) {
    return { kind: 'budgetStatus' };
  }

  const category = findCategory(text);
  const month = findMonth(text, year);
  if (/\b(spent|spend|spending)\b/.test(text) && category && month) {
    return { kind: 'spendByCategory', category, monthName: month.name, month: month.month };
  }

  if (/\b(trend|over time|compare|comparison|each month|month over month|monthly)\b/.test(text)) {
    return { kind: 'trend', category: findCategory(text) };
  }

  if (/\b(recap|summary|summarize|overview)\b/.test(text)) {
    const m = findMonth(text, year);
    const fallback = `${year}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`;
    return { kind: 'recap', month: m?.month ?? fallback, monthName: m?.name ?? 'this month' };
  }

  if (/\b(recent|latest|last)\b.*\b(transaction|transactions|purchase|purchases)\b/.test(text)) {
    return { kind: 'recentTransactions' };
  }

  const searchMatch = text.match(/\b(find|search|look up|transactions? (?:at|from|for))\b\s+(.*)/);
  if (searchMatch && searchMatch[2]) {
    return { kind: 'search', text: searchMatch[2].replace(/[?.!]+$/, '').trim() };
  }

  return { kind: 'unknown' };
}
