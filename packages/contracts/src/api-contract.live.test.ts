// API ↔ web contract guard. Validates that every GET endpoint the web consumes
// parses against the schema the web parses it with — catching "contract drift"
// like the {items} pagination envelope that silently returned [] in the UI.
//
// Integration test: it needs the API on :4000. When the API is unreachable it
// SKIPS (so offline `pnpm test` / CI stays green); run it with the local stack
// up (`docker compose up -d` + api + seed) to actually exercise it.
import { test, expect } from 'vitest';
import { z } from 'zod';
import { SignJWT } from 'jose';
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
  AuthUser,
} from './index';

const BASE = 'http://localhost:4000/api';
const DEMO_ID = '00000000-0000-0000-0000-000000000001';
const apiSecret = new TextEncoder().encode(process.env.API_JWT_SECRET ?? 'change-me-dev-only');

async function bearer(sub = DEMO_ID): Promise<Record<string, string>> {
  const jwt = await new SignJWT({})
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(sub)
    .setIssuer('spendlio-web')
    .setAudience('spendlio-api')
    .setIssuedAt()
    .setExpirationTime('5m')
    .sign(apiSecret);
  return { authorization: `Bearer ${jwt}` };
}

/** Bare `{ items }` envelope used by list resources (the web strips nextCursor). */
const items = <T extends z.ZodTypeAny>(s: T) => z.object({ items: z.array(s) });
/** Full `Page()` envelopes, built locally in the web from the contracts helper. */
const TransactionPage = Page(TransactionSchema);
const SettlementPage = Page(SettlementSchema);
const ReceiptPage = Page(ReceiptSchema);

async function get(path: string) {
  const res = await fetch(`${BASE}${path}`, { headers: await bearer(), signal: AbortSignal.timeout(2000) });
  return { status: res.status, body: res.status === 204 ? undefined : await res.json() };
}

async function post(path: string, body: unknown) {
  const res = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(2000),
  });
  return { status: res.status, body: res.status === 204 ? undefined : await res.json().catch(() => undefined) };
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

test('auth: rejects missing/invalid tokens; OTP endpoints behave', async () => {
  // Skip cleanly when the API isn't running.
  try {
    await fetch(`${BASE}/me`, { signal: AbortSignal.timeout(2000) });
  } catch {
    console.warn('[api-contract] API not reachable on :4000 — skipping auth check.');
    return;
  }

  // 401 with no token and with a garbage token.
  const noTok = await fetch(`${BASE}/me`, { signal: AbortSignal.timeout(2000) });
  expect(noTok.status).toBe(401);
  const badTok = await fetch(`${BASE}/me`, {
    headers: { authorization: 'Bearer not-a-jwt' },
    signal: AbortSignal.timeout(2000),
  });
  expect(badTok.status).toBe(401);

  // OTP request never enumerates (always 200) and verify rejects a wrong code.
  const reqRes = await post('/auth/otp/request', { email: 'demo@spendlio.app' });
  expect(reqRes.status).toBe(200);
  const wrong = await post('/auth/otp/verify', { email: 'demo@spendlio.app', code: '000000' });
  expect([400, 401]).toContain(wrong.status);

  // Happy-path roundtrip — only when not on cooldown (dev echoes the code).
  const devCode = (reqRes.body as { devCode?: string })?.devCode;
  if (devCode) {
    const ver = await post('/auth/otp/verify', { email: 'demo@spendlio.app', code: devCode });
    expect(ver.status).toBe(200);
    const u = AuthUser.safeParse(ver.body);
    expect(u.success).toBe(true);
    if (u.success) expect(u.data.id).toBe(DEMO_ID);
  }
}, 30000);
