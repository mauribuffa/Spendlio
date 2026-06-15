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
- **How:** **don't** dump raw transactions into a prompt. Pre-compute summaries (the workers already build `monthly_summaries`), and give the model **tools/functions** to query aggregates (`spendByCategory(month)`, `budgetStatus()`). The model orchestrates; your typed functions return the numbers. This keeps answers correct (real DB math, not the LLM "doing arithmetic") and cheap.
- The mobile kit's Assistant tab and the web Insights view model the *output*; the wiring is tool-calling over `core`/`db` aggregates.

## Cross-cutting principles
- **The LLM never does money math.** It calls typed functions that compute exact integer-cent results. (See the money rules in `03-database.md`.)
- **Validate AI output** against `contracts` schemas before persisting — treat the model like any untrusted input.
- **Cost control:** rules-first, cache results, batch where possible.
- **Privacy:** financial data in prompts is sensitive — pick a provider/data-handling posture deliberately (logged in `decisions.md`).
