import { generateObject, generateText, streamText, stepCountIs, tool, type ModelMessage } from 'ai';
import { z } from 'zod';
import { CategoryKey, formatMoney } from '@spendlio/contracts';
import { resolveLiveModel } from './model';
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

const CHAT_SYSTEM =
  'You are a grounded personal-finance assistant. Answer using ONLY the numbers returned by the tools. ' +
  'Never compute or estimate money amounts yourself — call a tool. Be concise and plain-spoken.';

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
              { type: 'text', text: 'Extract the merchant, purchase date (YYYY-MM-DD), total, currency, and line items.' },
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
      system: CHAT_SYSTEM,
      messages: toModelMessages(args.messages),
      tools: buildTools(args.tools),
      stopWhen: stepCountIs(6),
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
      system: CHAT_SYSTEM,
      messages: toModelMessages(args.messages),
      tools: buildTools(args.tools),
      stopWhen: stepCountIs(6),
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
  };
}
