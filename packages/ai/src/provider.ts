import { z } from 'zod';
import { CategoryKey, ReceiptLineItem, CurrencyCode } from '@spendlio/contracts';

/**
 * Input for text->category classification.
 * `amount` is integer minor units (cents); the model never does money math.
 */
export interface CategorizeInput {
  title: string;
  merchant?: string;
  amount: number; // minor units (cents)
  currency: string; // ISO 4217
}

/**
 * Image reference handed to OCR. `key` is an object-storage key (S3/MinIO);
 * `bytes` is optional inline content (used by the Claude vision path).
 */
export interface ReceiptImage {
  key: string;
  bytes?: Uint8Array;
}

/**
 * Line item for the OCR schema. OpenAI strict structured outputs require EVERY
 * property to be in the JSON schema's `required` array; the contract's
 * `ReceiptLineItem` defaults `quantity` (→ emitted as optional → OpenAI rejects
 * it: "Missing 'quantity'"). Override `quantity` to required here — a scanned
 * line always has a quantity — while the contract keeps its lenient default for
 * the confirm/storage paths.
 */
const OcrLineItem = ReceiptLineItem.extend({ quantity: z.number().int() });

/**
 * Structured OCR result. This is AI output and therefore untrusted —
 * it is validated against `ReceiptOcrResult` before any provider returns it.
 * Money fields are integer minor units (cents).
 */
export const ReceiptOcrResult = z.object({
  merchant: z.string().nullable(),
  date: z.string().nullable(), // YYYY-MM-DD (purchase date), null if unreadable
  total: z.number().int(), // minor units
  currency: CurrencyCode,
  lineItems: z.array(OcrLineItem),
  confidence: z.number().min(0).max(1),
});
export type ReceiptOcrResult = z.infer<typeof ReceiptOcrResult>;

/**
 * Per-category spend for a month. `amountCents` is exact integer cents
 * computed by the data layer, never by the model.
 */
export interface CategorySpend {
  category: CategoryKey;
  amountCents: number;
}

export interface BudgetLine {
  category: CategoryKey;
  limitCents: number;
  spentCents: number;
  remainingCents: number;
}

export interface RecentTransaction {
  id: string;
  title: string;
  merchant?: string;
  amountCents: number; // signed: negative = expense
  currency: string;
  category: CategoryKey;
  occurredAt: string; // ISO date
}

export interface BalanceLine {
  /** The other party in the shared expense. */
  personName: string;
  /** Signed integer cents: positive = they owe you, negative = you owe them. */
  netCents: number;
  currency: string;
}

/**
 * The typed tool surface the assistant orchestrates over. Every method returns
 * EXACT integer cents computed by the data layer — the model only selects which
 * tool to call and renders the returned numbers. This is what keeps answers
 * grounded (real DB math, not LLM arithmetic). Implementations land in Wave 2.
 */
export interface AssistantTools {
  /** Spend per category for a calendar month, `YYYY-MM`. */
  spendByCategory(month: string): Promise<CategorySpend[]>;
  /** Current budget status across categories for the active period. */
  budgetStatus(): Promise<BudgetLine[]>;
  /** The most recent `limit` transactions, newest first. */
  recentTransactions(limit: number): Promise<RecentTransaction[]>;
  /** Net balances with each person you share expenses with. */
  balancesSummary(): Promise<BalanceLine[]>;
}

/** A single turn in the assistant conversation. */
export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface ChatArgs {
  messages: ChatMessage[];
  tools: AssistantTools;
}

export interface ChatResult {
  answer: string;
  /** Names of the tools the provider invoked while answering. */
  usedTools: string[];
}

/**
 * A streaming chat response. The assistant is a request/response stream (NOT a
 * queue job), so the API turns this into an SSE body the web app's `useChat`
 * hook consumes. Both providers implement it: the live one wraps the AI SDK
 * stream, the offline one replays its computed answer.
 */
export interface ChatStream {
  /** Incremental text deltas — consumable as an async iterable. */
  textStream: AsyncIterable<string>;
  /** A `Response` whose body is an AI-SDK UI-message stream (for `useChat`). */
  toUIMessageStreamResponse(): Response;
  /** Resolves to the tools invoked, available after the stream is consumed. */
  usedTools(): Promise<string[]>;
}

/**
 * The single seam every AI backend implements. Two backends exist: an offline
 * deterministic engine (the default, zero external calls) and a live AI-SDK
 * adapter (Anthropic or OpenAI) that activates only when an API key is set.
 */
export interface LLMProvider {
  /** Text -> category, or null when the model is not confident enough. */
  categorize(input: CategorizeInput): Promise<CategoryKey | null>;
  /** Image -> structured receipt, validated against `ReceiptOcrResult`. */
  extractReceipt(image: ReceiptImage): Promise<ReceiptOcrResult>;
  /** Question -> grounded answer (non-streamed), orchestrating `tools` for exact numbers. */
  chat(args: ChatArgs): Promise<ChatResult>;
  /** Same as `chat`, but streaming — the path the chat HTTP endpoint uses. */
  streamChat(args: ChatArgs): ChatStream;
}
