import { createUIMessageStream, createUIMessageStreamResponse } from 'ai';
import { formatMoney, type CategoryKey } from '@spendlio/contracts';
import { categorizeByRules } from '../rules';
import {
  ReceiptOcrResult,
  type AssistantTools,
  type CategorizeInput,
  type ChatArgs,
  type ChatResult,
  type ChatStream,
  type LLMProvider,
  type ReceiptImage,
} from '../provider';
import { parseIntent } from './intent';

/** Format integer cents as a currency string at the UI edge. Defaults to USD. */
function money(cents: number, currency = 'USD'): string {
  return formatMoney({ amount: cents, currency });
}

/**
 * The default provider: a deterministic engine with NO external calls. It is the
 * baseline the whole product runs on when no Claude key is configured, and it is
 * fully testable because every output is a pure function of its input.
 */
export class OfflineProvider implements LLMProvider {
  /** Rules-first; when the rules can't decide, fall back to `transfer` (the safe, neutral bucket). */
  async categorize(input: CategorizeInput): Promise<CategoryKey | null> {
    return categorizeByRules({ title: input.title, merchant: input.merchant });
  }

  /** A plausible, deterministic mock receipt — validated against the OCR schema before returning. */
  async extractReceipt(_image: ReceiptImage): Promise<ReceiptOcrResult> {
    const result = {
      merchant: 'Demo Market',
      date: '2026-06-01',
      total: 1899, // $18.99
      currency: 'USD',
      lineItems: [
        { description: 'Coffee beans', quantity: 1, amount: 1299 },
        { description: 'Oat milk', quantity: 2, amount: 600 },
      ],
      confidence: 0.5,
      category: 'groceries' as const,
    };
    // Treat our own output as untrusted: parse it through the contract.
    return ReceiptOcrResult.parse(result);
  }

  /**
   * Deterministic intent-matching chat. It parses the latest user question, calls
   * the injected tools for EXACT cents, and renders a grounded plain-spoken answer.
   * The model never does arithmetic — the tools return computed integers.
   */
  async chat(args: ChatArgs): Promise<ChatResult> {
    const lastUser = [...args.messages].reverse().find((m) => m.role === 'user');
    const question = lastUser?.content ?? '';
    const intent = parseIntent(question);
    const usedTools: string[] = [];

    switch (intent.kind) {
      case 'spendByCategory': {
        usedTools.push('spendByCategory');
        const rows = await args.tools.spendByCategory(intent.month);
        const row = rows.find((r) => r.category === intent.category);
        const cents = row?.amountCents ?? 0;
        return {
          answer: `You spent ${money(cents)} on ${intent.category} in ${intent.monthName}.`,
          usedTools,
        };
      }
      case 'budgetStatus': {
        usedTools.push('budgetStatus');
        const lines = await args.tools.budgetStatus();
        if (lines.length === 0) {
          return { answer: 'You have no budgets set up yet.', usedTools };
        }
        const parts = lines.map(
          (l) => `${l.category}: ${money(l.spentCents)} of ${money(l.limitCents)} (${money(l.remainingCents)} left)`,
        );
        return { answer: `Here is your budget status. ${parts.join('; ')}.`, usedTools };
      }
      case 'recentTransactions': {
        usedTools.push('recentTransactions');
        const txns = await args.tools.recentTransactions(5);
        if (txns.length === 0) {
          return { answer: 'You have no recent transactions.', usedTools };
        }
        const parts = txns.map((t) => `${t.title} ${money(t.amountCents, t.currency)}`);
        return { answer: `Your most recent transactions: ${parts.join(', ')}.`, usedTools };
      }
      case 'balancesSummary': {
        usedTools.push('balancesSummary');
        const balances = await args.tools.balancesSummary();
        if (balances.length === 0) {
          return { answer: 'You are all settled up — no outstanding balances.', usedTools };
        }
        const parts = balances.map((b) =>
          b.netCents >= 0
            ? `${b.personName} owes you ${money(Math.abs(b.netCents), b.currency)}`
            : `you owe ${b.personName} ${money(Math.abs(b.netCents), b.currency)}`,
        );
        return { answer: `${parts.join('; ')}.`, usedTools };
      }
      case 'balanceWithPerson': {
        usedTools.push('balanceWithPerson');
        const d = await args.tools.balanceWithPerson(intent.person);
        if (!d) return { answer: `I couldn't find anyone named "${intent.person}".`, usedTools };
        const verb = d.netCents >= 0 ? 'owes you' : 'you owe';
        return { answer: `${d.personName} ${verb} ${money(Math.abs(d.netCents), d.currency)}.`, usedTools };
      }
      case 'search': {
        usedTools.push('searchTransactions');
        const rows = await args.tools.searchTransactions({ text: intent.text, limit: 5 });
        if (rows.length === 0) {
          return { answer: `I found no transactions matching "${intent.text}".`, usedTools };
        }
        const parts = rows.map((r) => `${r.title} ${money(r.amountCents, r.currency)}`);
        return { answer: `Matches for "${intent.text}": ${parts.join(', ')}.`, usedTools };
      }
      case 'trend': {
        usedTools.push('spendingTrend');
        const now = new Date();
        const toMonth = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`;
        const fromD = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 2, 1));
        const fromMonth = `${fromD.getUTCFullYear()}-${String(fromD.getUTCMonth() + 1).padStart(2, '0')}`;
        const months = await args.tools.spendingTrend({
          fromMonth,
          toMonth,
          categories: intent.category ? [intent.category] : undefined,
        });
        const parts = months.map((m) => `${m.month}: ${money(m.totalCents)}`);
        return { answer: `Spending by month — ${parts.join(', ')}.`, usedTools };
      }
      case 'recap': {
        usedTools.push('monthlyRecap');
        const r = await args.tools.monthlyRecap(intent.month);
        return {
          answer: `In ${intent.monthName} you earned ${money(r.incomeCents)} and spent ${money(r.expenseCents)} (net ${money(r.netCents)}).`,
          usedTools,
        };
      }
      default:
        return {
          answer:
            "I can help with spending by category (e.g. \"how much did I spend on dining in May?\"), budgets, recent transactions, and who owes whom.",
          usedTools,
        };
    }
  }

  /**
   * Streaming chat over the SAME deterministic logic as `chat()` — it computes
   * the grounded answer, then replays it as a `useChat`-compatible UI-message
   * stream so the chat HTTP endpoint can serve the offline and live paths
   * uniformly. No model is called; the engine stays deterministic and key-free.
   */
  streamChat(args: ChatArgs): ChatStream {
    const resultPromise = this.chat(args);
    return {
      textStream: textStreamOf(resultPromise),
      toUIMessageStreamResponse: () =>
        createUIMessageStreamResponse({ stream: uiMessageStreamOf(resultPromise) }),
      usedTools: async () => (await resultPromise).usedTools,
    };
  }
}

/** An async iterable yielding the computed answer as a single text delta. */
async function* textStreamOf(resultPromise: Promise<ChatResult>): AsyncIterable<string> {
  const { answer } = await resultPromise;
  yield answer;
}

/** Wrap the computed answer as a UI-message stream (text-start/delta/end). */
function uiMessageStreamOf(resultPromise: Promise<ChatResult>) {
  return createUIMessageStream({
    execute: async ({ writer }) => {
      const { answer } = await resultPromise;
      const id = 'offline-answer';
      writer.write({ type: 'text-start', id });
      writer.write({ type: 'text-delta', id, delta: answer });
      writer.write({ type: 'text-end', id });
    },
  });
}

// Re-exported for callers and tests.
export { parseIntent } from './intent';
