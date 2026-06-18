import { generateObject, generateText, streamText, stepCountIs, tool, type ModelMessage } from 'ai';
import { z } from 'zod';
import { CategoryKey, formatMoney } from '@spendlio/contracts';
import { resolveLiveModel } from './model';
import { subtotalByCurrency } from '../tools/db-tools';
import { CHAT_SYSTEM } from '../system-prompt';
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

/** Format integer cents at the UI edge so tool outputs render as money. Defaults to USD. */
const money = (cents: number, currency = 'USD'): string => formatMoney({ amount: cents, currency });

// Bounded per-call timeouts (ADR-029) so a hung provider can't pin a worker
// concurrency slot forever. OCR's bound sits below the worker's lockDuration (120s).
const CATEGORIZE_TIMEOUT_MS = 30_000;
const OCR_TIMEOUT_MS = 90_000;
const CHAT_TIMEOUT_MS = 60_000;

/**
 * `CHAT_SYSTEM` plus today's date. The model's training cutoff makes it assume a
 * stale "now" (e.g. it resolves "this year" to 2023), so relative-time questions
 * ("this month", "recently", "last year") would build wrong date filters and
 * silently return nothing. Anchoring the date here fixes every time-relative tool call.
 */
function chatSystem(): string {
  const today = new Date().toISOString().slice(0, 10);
  return `${CHAT_SYSTEM}\n\nToday's date is ${today} (UTC). Resolve every relative time reference ("this month", "last year", "recently", a bare month name, etc.) against that date — never assume a different current date.`;
}

/**
 * The live, provider-agnostic adapter (Vercel AI SDK). The underlying model is
 * Claude when ANTHROPIC_API_KEY is set, else OpenAI when AI_PROVIDER=openai +
 * OPENAI_API_KEY (see resolveLiveModel). Every model output is re-validated
 * against a contracts schema before it leaves this class — the model is treated
 * as untrusted input.
 *
 * Note: with no key these paths are not exercised at runtime; they must remain
 * structurally correct and typecheck.
 */
export class LiveProvider implements LLMProvider {
  private readonly model = resolveLiveModel();

  /** Constrained classification: the model returns exactly one CategoryKey, validated against the enum. */
  async categorize(input: CategorizeInput): Promise<CategoryKey | null> {
    try {
      const { object } = await generateObject({
        model: this.model,
        output: 'enum',
        enum: [...CategoryKey.options],
        system:
          'You categorize a single financial transaction into exactly one category. ' +
          'Reply with only the category key.',
        prompt:
          `Title: ${input.title}\n` +
          `Merchant: ${input.merchant ?? 'unknown'}\n` +
          `Amount (minor units): ${input.amount} ${input.currency}`,
        abortSignal: AbortSignal.timeout(CATEGORIZE_TIMEOUT_MS),
      });
      // Defensive: the enum mode already constrains output, but validate anyway.
      const parsed = CategoryKey.safeParse(object);
      return parsed.success ? parsed.data : null;
    } catch (err) {
      // categorize's contract is null-on-failure (timeout/abort/provider error);
      // the worker then leaves the existing category untouched. Don't throw.
      console.error(`[ai] categorize failed: ${(err as Error).message}`);
      return null;
    }
  }

  /** Vision OCR: the model returns the receipt shape, re-validated against the OCR schema. */
  async extractReceipt(image: ReceiptImage): Promise<ReceiptOcrResult> {
    try {
      const { object } = await generateObject({
        // One source of truth for the receipt shape — the contracts-backed
        // ReceiptOcrResult (CurrencyCode + ReceiptLineItem), not a re-inline.
        model: this.model,
        schema: ReceiptOcrResult,
        system:
          'You extract structured data from a receipt image. ' +
          'All money amounts are integer minor units (cents). Never do arithmetic that loses precision.',
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: 'Extract the merchant, purchase date (YYYY-MM-DD), total, currency, line items, and the single best-fit spending category (use null if unsure).' },
              image.bytes
                ? { type: 'image', image: image.bytes }
                : { type: 'text', text: `Receipt image key: ${image.key}` },
            ],
          },
        ],
        abortSignal: AbortSignal.timeout(OCR_TIMEOUT_MS),
      });
      // Re-validate through the contract before returning.
      return ReceiptOcrResult.parse(object);
    } catch (err) {
      // Surface a typed error so the worker retries (and dead-letters on the
      // final attempt) rather than persisting a half-baked receipt.
      throw new Error(`receipt extraction failed: ${(err as Error).message}`);
    }
  }

  /**
   * Tool-use chat (non-streamed). The model orchestrates our typed tools, which
   * return EXACT integer cents; the model never performs money arithmetic itself.
   */
  async chat(args: ChatArgs): Promise<ChatResult> {
    const result = await generateText({
      model: this.model,
      system: chatSystem(),
      messages: toModelMessages(args.messages),
      tools: buildTools(args.tools),
      stopWhen: stepCountIs(8),
      abortSignal: AbortSignal.timeout(CHAT_TIMEOUT_MS),
    });
    return { answer: result.text, usedTools: toolNames(result.steps) };
  }

  /**
   * Streaming chat — the path the chat HTTP endpoint uses. Returns the AI SDK
   * stream result, which the API turns into an SSE body via
   * `toUIMessageStreamResponse()` for the web app's `useChat` hook.
   */
  streamChat(args: ChatArgs): ChatStream {
    const result = streamText({
      model: this.model,
      system: chatSystem(),
      messages: toModelMessages(args.messages),
      tools: buildTools(args.tools),
      stopWhen: stepCountIs(8),
      abortSignal: AbortSignal.timeout(CHAT_TIMEOUT_MS),
    });
    return {
      textStream: result.textStream,
      toUIMessageStreamResponse: () => result.toUIMessageStreamResponse(),
      // Consuming the stream drives tool execution; awaiting steps waits for completion.
      usedTools: async () => toolNames(await result.steps),
    };
  }
}

function toModelMessages(messages: ChatArgs['messages']): ModelMessage[] {
  return messages.map((m) => ({ role: m.role, content: m.content }));
}

/** Unique tool names across all completed steps. */
function toolNames(steps: Array<{ toolCalls: Array<{ toolName: string }> }>): string[] {
  return [...new Set(steps.flatMap((s) => s.toolCalls.map((c) => c.toolName)))];
}

/**
 * Wrap the typed AssistantTools as AI SDK tools. Each tool returns pre-formatted,
 * exact figures so the model only narrates — it never does the math.
 */
function buildTools(t: AssistantTools) {
  return {
    spendByCategory: tool({
      description: 'Spend per category for a calendar month (format YYYY-MM). Returns exact amounts.',
      inputSchema: z.object({ month: z.string().describe('Calendar month, e.g. 2026-05') }),
      execute: async ({ month }) => {
        const rows = await t.spendByCategory(month);
        return rows.map((r) => ({ category: r.category, amount: money(r.amountCents) }));
      },
    }),
    budgetStatus: tool({
      description: 'Current budget status across categories for the active period. Returns exact amounts.',
      inputSchema: z.object({}),
      execute: async () => {
        const lines = await t.budgetStatus();
        return lines.map((l) => ({
          category: l.category,
          limit: money(l.limitCents),
          spent: money(l.spentCents),
          remaining: money(l.remainingCents),
        }));
      },
    }),
    recentTransactions: tool({
      description: 'The most recent transactions, newest first. Returns exact amounts.',
      // `.default()` is safe here: tool/function calls are sent non-strict. If this ever becomes a
      // strict structured call, switch params to `.nullable()` — OpenAI strict requires every property.
      inputSchema: z.object({ limit: z.number().int().min(1).max(50).default(5) }),
      execute: async ({ limit }) => {
        const txns = await t.recentTransactions(limit);
        return txns.map((x) => ({
          title: x.title,
          amount: money(x.amountCents, x.currency),
          category: x.category,
          occurredAt: x.occurredAt,
        }));
      },
    }),
    balancesSummary: tool({
      description: 'Net balances with each person you share expenses with. Returns exact amounts.',
      inputSchema: z.object({}),
      execute: async () => {
        const balances = await t.balancesSummary();
        return balances.map((b) => ({
          person: b.personName,
          net: money(b.netCents, b.currency),
          direction: b.netCents >= 0 ? 'they owe you' : 'you owe them',
        }));
      },
    }),
    balanceWithPerson: tool({
      description:
        'The balance with ONE person (matched by name): the net, the shares that make it up, and settlement history. Use for "what\'s my balance with X" / "what did I split with X". Returns exact amounts. Null-equivalent (empty) if the name matches no one.',
      inputSchema: z.object({ person: z.string().describe('the person\'s name or part of it') }),
      execute: async ({ person }) => {
        const d = await t.balanceWithPerson(person);
        if (!d) return { found: false as const, person };
        return {
          found: true as const,
          person: d.personName,
          net: money(d.netCents, d.currency),
          direction: d.netCents >= 0 ? 'they owe you' : 'you owe them',
          shares: d.shares.map((s) => money(s.amountCents, s.currency)),
          settlements: d.settlements.map((s) => ({
            amount: money(s.amountCents, s.currency),
            direction: s.direction,
            settledAt: s.settledAt,
          })),
        };
      },
    }),
    searchTransactions: tool({
      description:
        'Search and filter the user\'s transactions. Use `text` for merchant/title/note keywords — to answer a CONCEPT (e.g. "coffee", "rideshare") expand it into likely merchant/keyword terms yourself and search those. Amounts are in the major currency unit (dollars). Returns matching transactions, newest first. Set ONLY the filters the user explicitly asked for and leave the rest unset — do NOT default `status`, dates, or amounts, or you will hide matching rows (e.g. pending transactions).',
      inputSchema: z.object({
        text: z.string().optional().describe('keyword(s) to match in merchant/title/note'),
        categories: z.array(CategoryKey).optional(),
        minAmount: z.number().optional().describe('minimum absolute amount, in dollars'),
        maxAmount: z.number().optional().describe('maximum absolute amount, in dollars'),
        from: z.string().optional().describe('start date inclusive, YYYY-MM-DD'),
        to: z.string().optional().describe('end date inclusive, YYYY-MM-DD'),
        status: z.string().optional().describe('ONLY set if the user asks for a specific status (e.g. "pending"); otherwise omit to search all statuses'),
        limit: z.number().int().min(1).max(50).default(20),
      }),
      execute: async (a) => {
        // 2-dp major->minor, consistent with the app's other manual-entry paths.
        const rows = await t.searchTransactions({
          text: a.text,
          categories: a.categories,
          minCents: a.minAmount != null ? Math.round(a.minAmount * 100) : undefined,
          maxCents: a.maxAmount != null ? Math.round(a.maxAmount * 100) : undefined,
          from: a.from,
          to: a.to,
          status: a.status,
          limit: a.limit,
        });
        return rows.map((x) => ({
          title: x.title,
          merchant: x.merchant,
          amount: money(x.amountCents, x.currency),
          category: x.category,
          occurredAt: x.occurredAt,
        }));
      },
    }),
    spendingTrend: tool({
      description:
        'Expense totals per month across a range (inclusive, max 24 months), optionally filtered to categories. Use to compare months or describe a trend. Returns exact amounts.',
      inputSchema: z.object({
        fromMonth: z.string().describe('start month inclusive, YYYY-MM'),
        toMonth: z.string().describe('end month inclusive, YYYY-MM'),
        categories: z.array(CategoryKey).optional(),
      }),
      execute: async ({ fromMonth, toMonth, categories }) => {
        const months = await t.spendingTrend({ fromMonth, toMonth, categories });
        return months.map((m) => ({
          month: m.month,
          total: money(m.totalCents),
          byCategory: m.byCategory.map((c) => ({ category: c.category, amount: money(c.amountCents) })),
        }));
      },
    }),
    monthlyRecap: tool({
      description:
        'Summarize a single month (YYYY-MM): total income, total expense, net, spending by category, and the top merchant. Returns exact amounts.',
      inputSchema: z.object({ month: z.string().describe('Calendar month, e.g. 2026-05') }),
      execute: async ({ month }) => {
        const r = await t.monthlyRecap(month);
        return {
          month: r.month,
          income: money(r.incomeCents),
          expense: money(r.expenseCents),
          net: money(r.netCents),
          byCategory: r.byCategory.map((c) => ({ category: c.category, amount: money(c.amountCents) })),
          topMerchant: r.topMerchant,
        };
      },
    }),
    accountBalances: tool({
      description:
        'The net balance of each account, in that account\'s own currency. Do NOT sum across different currencies; report each, and a per-currency subtotal at most. Returns exact amounts.',
      inputSchema: z.object({}),
      execute: async () => {
        const lines = await t.accountBalances();
        return {
          accounts: lines.map((l) => ({ account: l.accountName, balance: money(l.balanceCents, l.currency) })),
          byCurrency: subtotalByCurrency(lines).map((s) => ({ currency: s.currency, total: money(s.totalCents, s.currency) })),
        };
      },
    }),
  };
}
