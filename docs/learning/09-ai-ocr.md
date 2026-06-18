# 09 · AI, OCR & the assistant

> ⬜ Provider choices open. This file explains the three AI features and how they fit the queue + data model.

Spendlio has three distinct "AI" features. They're different problems — don't conflate them.

## 1. Receipt OCR (image → structured data)
- **Job:** turn a photo of a receipt into merchant, date, line items, total.
- **How:** a vision/OCR step (a multimodal LLM, or a dedicated OCR service like AWS Textract / Google Document AI) → output validated against the `Receipt` OCR schema in `contracts`.
- **Where it runs:** the `[ocr]` queue job — slow, external, retryable. → [`07-queues-jobs.md`](./07-queues-jobs.md)
- **Always confirmable:** OCR is never 100%. The UI shows the parsed items with a confidence and lets the user edit before saving (see the scan sheet in the mobile kit).

## 2. AI categorization (text → category)
- **Job:** given "BLUE BOTTLE COFFEE $6.75", pick `dining`.
- **How:** start with **cheap deterministic rules** (merchant keyword map) and only call an LLM for the unknowns — most transactions categorize for free, the LLM handles the long tail. Output constrained to the known `CategoryKey` enum from `contracts`.
- **Learn-by-doing:** this is a great place to see how a tiny rules layer saves most of your AI spend.

## 3. The assistant (question → answer over your data)
- **Job:** "How much did I spend on dining in May?" → a grounded, accurate answer.
- **How:** **don't** dump raw transactions into a prompt. Give the model a typed, **read-only** tool surface to query aggregates; the model orchestrates which tool to call, your functions return exact integer-cent numbers. This keeps answers correct (real DB math, not the LLM "doing arithmetic") and cheap. There are **9 tools** today (ADR-041): `spendByCategory(month)`, `budgetStatus()`, `recentTransactions(limit)`, `balancesSummary()`, `searchTransactions(filter)`, `spendingTrend({categories?, fromMonth, toMonth})`, `balanceWithPerson(query)`, `monthlyRecap(month)`, and `accountBalances()`. Every tool is `user_id`-scoped and soft-delete-aware. `accountBalances` returns per-account balances + a per-currency subtotal but **no** cross-currency converted total — that needs an FX rate decision (ADR-016, still open).
- **Free-text search is lexical + LLM expansion, by design.** `searchTransactions` runs a Postgres `ILIKE` over `title`/`merchant`/`note`; the model does the semantic work (expanding "coffee" → "espresso", "latte", merchant names) before it calls the tool. We deliberately did **not** reach for pgvector/embeddings, BM25/ParadeDB, or Postgres full-text search: each user's corpus is already `user_id`-narrowed and tiny, so there is nothing to rank at scale, and the LLM already supplies relevance. No new table, no migration. `pg_trgm` is a documented **follow-up** only — to add fuzzy/typo matching if it proves necessary (ADR-041).
- The mobile kit's Assistant tab and the web Insights view model the *output*; the wiring is tool-calling over `core`/`db` aggregates.

## Cross-cutting principles
- **The LLM never does money math.** It calls typed functions that compute exact integer-cent results. (See the money rules in `03-database.md`.)
- **Validate AI output** against `contracts` schemas before persisting — treat the model like any untrusted input.
- **Cost control:** rules-first, cache results, batch where possible.
- **Privacy:** financial data in prompts is sensitive — pick a provider/data-handling posture deliberately (provider/privacy choice still open: ADR-011).
- **Prompt-injection posture (ADR-041).** The load-bearing guarantee is **structural**: the assistant is **read-only** (no mutations, so a hijacked model can't trigger destructive actions) and every tool filters by the JWT `sub`, so it can never read another user's data. On top of that, a pragmatic baseline: input caps on the chat request (`content` ≤ 4000 chars, `messages` ≤ 50) via the contracts Zod pipe; **system-prompt spotlighting** (`packages/ai/src/system-prompt.ts` tells the model that tool output and any merchant/title/note/OCR text is DATA, never instructions); a per-user Redis fixed-window rate limit (30/min) on `POST /assistant`; and plain-text web rendering (no markdown/HTML renderer) locked by a guard comment to keep the image-exfiltration vector closed. Defense-in-depth (classifier pass, audit log, render allowlist) is **deferred** — revisit if shared/multi-tenant data ever flows into the assistant.
