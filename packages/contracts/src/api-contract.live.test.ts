// API ↔ web contract guard. Validates that every GET endpoint the web consumes
// parses against the schema the web parses it with — catching "contract drift"
// like the {items} pagination envelope that silently returned [] in the UI.
//
// Integration test: it needs the API on :4000. When the API is unreachable it
// SKIPS (so offline `pnpm test` / CI stays green); run it with the local stack
// up (`docker compose up -d` + api + seed) to actually exercise it.
import { test, expect } from 'vitest';
import { z } from 'zod';
import {
  Page,
  TransactionSchema,
  BudgetSchema,
  BudgetStatus,
  CategorySchema,
  AccountSchema,
  AccountBalanceSchema,
  PersonSchema,
  GroupSchema,
  SplitSchema,
  SettlementSchema,
  Balance,
  UserSchema,
  ReceiptSchema,
  MonthlySummarySchema,
} from './index';

const BASE = 'http://localhost:4000/api';
const H = { 'x-user-id': '00000000-0000-0000-0000-000000000001' };

/** Bare `{ items }` envelope used by list resources (the web strips nextCursor). */
const items = <T extends z.ZodTypeAny>(s: T) => z.object({ items: z.array(s) });
/** Full `Page()` envelopes, built locally in the web from the contracts helper. */
const TransactionPage = Page(TransactionSchema);
const SettlementPage = Page(SettlementSchema);
const ReceiptPage = Page(ReceiptSchema);

async function get(path: string) {
  const res = await fetch(`${BASE}${path}`, { headers: H, signal: AbortSignal.timeout(2000) });
  return { status: res.status, body: res.status === 204 ? undefined : await res.json() };
}

test('every web GET endpoint parses against its schema', async () => {
  // Skip cleanly when the API isn't running (keeps offline test runs green).
  try {
    await get('/me');
  } catch {
    console.warn('[api-contract] API not reachable on :4000 — skipping live contract check.');
    return;
  }

  const txList = await get('/transactions');
  const rcList = await get('/receipts');
  const txId = (txList.body as { items?: { id: string }[] })?.items?.[0]?.id;
  const rcId = (rcList.body as { items?: { id: string }[] })?.items?.[0]?.id;
  const month = new Date().toISOString().slice(0, 7);

  const cases: Array<[string, z.ZodTypeAny, boolean?]> = [
    ['/transactions', TransactionPage],
    ['/budgets', items(BudgetSchema)],
    ['/budgets/status', z.array(BudgetStatus)],
    ['/categories', items(CategorySchema)],
    ['/accounts', items(AccountSchema)],
    ['/accounts/balances', z.array(AccountBalanceSchema)],
    ['/people', items(PersonSchema)],
    ['/groups', z.array(GroupSchema)],
    ['/splits', items(SplitSchema)],
    ['/balances', z.array(Balance)],
    ['/settlements', SettlementPage],
    ['/me', UserSchema],
    ['/receipts', ReceiptPage],
    [`/recaps/${month}`, MonthlySummarySchema, true], // 404 if recap not built — tolerated
    ...(txId ? [[`/transactions/${txId}`, TransactionSchema] as [string, z.ZodTypeAny]] : []),
    ...(rcId ? [[`/receipts/${rcId}`, ReceiptSchema] as [string, z.ZodTypeAny]] : []),
  ];

  const failures: string[] = [];
  for (const [path, schema, tolerate404] of cases) {
    const { status, body } = await get(path);
    if (status === 404 && tolerate404) continue;
    if (status >= 400) {
      failures.push(`${path} → HTTP ${status}`);
      continue;
    }
    const r = schema.safeParse(body);
    if (!r.success) {
      const i = r.error.issues[0];
      failures.push(`${path} → ${i.path.join('.') || '(root)'}: ${i.message}`);
    }
  }

  if (failures.length) console.error('CONTRACT FAILURES:\n' + failures.map((f) => '  ✗ ' + f).join('\n'));
  expect(failures).toEqual([]);
}, 30000);
