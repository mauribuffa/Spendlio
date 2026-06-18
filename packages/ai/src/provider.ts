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
  // Best-fit spending category the vision model infers from the whole receipt.
  // `.nullable()` (not optional/default) keeps it in OpenAI strict-output `required`;
  // the model returns null when it is not confident.
  category: CategoryKey.nullable(),
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

/** Total expense for one month, with an optional per-category breakdown. */
export interface MonthSpend {
  month: string; // YYYY-MM
  totalCents: number;
  byCategory: CategorySpend[];
}

/** Monthly recap, all exact integer cents (base currency). */
export interface MonthlyRecap {
  month: string;
  incomeCents: number;
  expenseCents: number;
  netCents: number;
  byCategory: CategorySpend[];
  topMerchant: string | null;
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

/** Detailed balance with one person (exact integer cents). */
export interface PersonBalanceDetail {
  personName: string;
  netCents: number; // positive = they owe you, negative = you owe them
  currency: string;
  shares: { amountCents: number; currency: string }[];
  settlements: { amountCents: number; direction: 'they_paid_you' | 'you_paid_them'; currency: string; settledAt: string | null }[];
}

/** A single account's net balance (exact integer cents, the account's own currency). */
export interface AccountBalanceLine {
  accountName: string;
  currency: string;
  balanceCents: number;
}

/** Filters for transaction search. All optional; combined with AND. `text` is matched case-insensitively across title/merchant/note. */
export interface TransactionFilter {
  text?: string;
  categories?: CategoryKey[];
  minCents?: number; // absolute magnitude, minor units
  maxCents?: number;
  from?: string; // YYYY-MM-DD inclusive
  to?: string; // YYYY-MM-DD inclusive
  status?: string; // e.g. 'cleared' | 'pending'
  limit?: number; // default 20, clamped to [1, 50]
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
  /** Balance + contributing shares + settlement history for one person, matched by name. Null if no match. */
  balanceWithPerson(query: string): Promise<PersonBalanceDetail | null>;
  /** Search/filter transactions. Lexical `text` over title/merchant/note + structured filters. Newest first, capped. */
  searchTransactions(filter: TransactionFilter): Promise<RecentTransaction[]>;
  /** Per-month expense totals across an inclusive month range (capped at 24 months). */
  spendingTrend(args: { categories?: CategoryKey[]; fromMonth: string; toMonth: string }): Promise<MonthSpend[]>;
  /** Income/expense/net + category breakdown + top merchant for a month (YYYY-MM). */
  monthlyRecap(month: string): Promise<MonthlyRecap>;
  /** Net balance per account (sum of its transactions), in each account's own currency. */
  accountBalances(): Promise<AccountBalanceLine[]>;
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
