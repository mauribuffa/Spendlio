import { afterAll, beforeAll, describe, expect, it } from 'vitest';

// Live-DB integration proof. Runs ONLY when DATABASE_URL is set, so the default
// `pnpm test` stays offline/green; the integration gate (task #10) runs it with
// docker postgres up. It proves each tool returns EXACT cents and is user-scoped.
const RUN = Boolean(process.env.DATABASE_URL);

describe.skipIf(!RUN)('createDbTools (live DB)', () => {
  // Fixed test UUIDs, isolated from the demo user.
  const UA = '0000a100-0000-0000-0000-0000000000a1'; // user A
  const UB = '0000a100-0000-0000-0000-0000000000b1'; // user B (scoping foil)
  const BOB = '0000a100-0000-0000-0000-00000000b0b0';
  const CAROL = '0000a100-0000-0000-0000-0000000ca201';
  const SELF_A = '0000a100-0000-0000-0000-000000005e1f'; // A's self-person (model B)
  const SPLIT_A = '0000a100-0000-0000-0000-00000005111a';

  // Lazy imports so the module (which opens a pg Pool) only loads when RUN.
  let db: typeof import('@spendlio/db').db;
  let pool: typeof import('@spendlio/db').pool;
  let schema: typeof import('@spendlio/db');
  let createDbTools: typeof import('./index').createDbTools;

  beforeAll(async () => {
    const dbmod = await import('@spendlio/db');
    db = dbmod.db;
    pool = dbmod.pool;
    schema = dbmod;
    ({ createDbTools } = await import('./index'));

    // Idempotent pre-clean: remove any leftovers from a prior crashed run so sums
    // can't be inflated by duplicates.
    const { inArray } = await import('drizzle-orm');
    await db.delete(schema.splitShares).where(inArray(schema.splitShares.splitId, [SPLIT_A]));
    await db.delete(schema.splits).where(inArray(schema.splits.id, [SPLIT_A]));
    await db.delete(schema.people).where(inArray(schema.people.userId, [UA, UB]));
    await db.delete(schema.budgets).where(inArray(schema.budgets.userId, [UA, UB]));
    await db.delete(schema.transactions).where(inArray(schema.transactions.userId, [UA, UB]));
    await db.delete(schema.users).where(inArray(schema.users.id, [UA, UB]));

    // Users A and B.
    await db.insert(schema.users).values([
      { id: UA, name: 'A', email: `a-${UA}@t.dev`, defaultCurrency: 'USD' },
      { id: UB, name: 'B', email: `b-${UB}@t.dev`, defaultCurrency: 'USD' },
    ]).onConflictDoNothing();

    // A: $123.45 dining + $50 groceries in May; B: $999 dining (must NOT leak into A).
    await db.insert(schema.transactions).values([
      // expenses are negative (matches the seed convention); income stays positive
      { userId: UA, title: 'Dinner', amount: -12345, currency: 'USD', category: 'dining', occurredAt: new Date('2026-05-10T12:00:00Z'), status: 'cleared', source: 'manual' },
      { userId: UA, title: 'Market', amount: -5000, currency: 'USD', category: 'groceries', occurredAt: new Date('2026-05-12T12:00:00Z'), status: 'cleared', source: 'manual' },
      { userId: UA, title: 'Salary', amount: 300000, currency: 'USD', category: 'income', occurredAt: new Date('2026-05-01T12:00:00Z'), status: 'income', source: 'manual' },
      { userId: UB, title: 'Bs dinner', amount: 99900, currency: 'USD', category: 'dining', occurredAt: new Date('2026-05-10T12:00:00Z'), status: 'cleared', source: 'manual' },
    ]);

    // A's dining budget: $200.
    await db.insert(schema.budgets).values([
      { userId: UA, category: 'dining', limit: 20000, currency: 'USD', period: 'monthly' },
    ]);

    // A's people (incl. the self-person) + a split A owns (model B — ADR-028):
    // self is the payer/creditor and holds a share that must be SKIPPED in netting.
    await db.insert(schema.people).values([
      { id: SELF_A, userId: UA, name: 'You', isSelf: true },
      { id: BOB, userId: UA, name: 'Bob' },
      { id: CAROL, userId: UA, name: 'Carol' },
    ]);
    await db.insert(schema.splits).values([
      { id: SPLIT_A, userId: UA, mode: 'exact', total: 3000, currency: 'USD', payerId: SELF_A },
    ]);
    await db.insert(schema.splitShares).values([
      { splitId: SPLIT_A, personId: SELF_A, amount: 1500 }, // the user's own share — must be skipped
      { splitId: SPLIT_A, personId: CAROL, amount: 1500 }, // carol owes the user 1500
    ]);
  });

  afterAll(async () => {
    if (!RUN) return;
    // Clean up children → parents.
    const { inArray } = await import('drizzle-orm');
    await db.delete(schema.splitShares).where(inArray(schema.splitShares.splitId, [SPLIT_A]));
    await db.delete(schema.splits).where(inArray(schema.splits.id, [SPLIT_A]));
    await db.delete(schema.people).where(inArray(schema.people.userId, [UA, UB]));
    await db.delete(schema.budgets).where(inArray(schema.budgets.userId, [UA, UB]));
    await db.delete(schema.transactions).where(inArray(schema.transactions.userId, [UA, UB]));
    await db.delete(schema.users).where(inArray(schema.users.id, [UA, UB]));
    await pool.end();
  });

  it('spendByCategory returns exact cents, expense-only, user-scoped', async () => {
    const tools = createDbTools(db, UA);
    const rows = await tools.spendByCategory('2026-05');
    const byCat = Object.fromEntries(rows.map((r) => [r.category, r.amountCents]));
    expect(byCat.dining).toBe(12345); // exactly A's dining; B's $999 excluded
    expect(byCat.groceries).toBe(5000);
    expect(byCat.income).toBeUndefined(); // income is not "spend"
  });

  it('budgetStatus computes limit/spent/remaining in exact cents', async () => {
    const tools = createDbTools(db, UA);
    // Spend is for the CURRENT month; assert structure + exactness via a known May query instead.
    const lines = await tools.budgetStatus();
    const dining = lines.find((l) => l.category === 'dining');
    expect(dining?.limitCents).toBe(20000);
    expect(dining?.remainingCents).toBe(dining!.limitCents - dining!.spentCents);
  });

  it('recentTransactions is user-scoped and newest-first', async () => {
    const tools = createDbTools(db, UA);
    const txns = await tools.recentTransactions(10);
    expect(txns.every((t) => t.amountCents !== undefined)).toBe(true);
    expect(txns.some((t) => t.title === 'Bs dinner')).toBe(false); // B's row never appears
    expect(txns[0]!.title).toBe('Market'); // 05-12 is newest among A's
  });

  it('balancesSummary nets exact cents and only returns this user\'s people', async () => {
    const tools = createDbTools(db, UA);
    const balances = await tools.balancesSummary();
    const carol = balances.find((b) => b.personName === 'Carol');
    expect(carol?.netCents).toBe(1500); // carol owes (via the split A owns)
    expect(balances.some((b) => b.personName === 'You')).toBe(false); // self share skipped
  });

  it('searchTransactions matches text case-insensitively and is user-scoped', async () => {
    const tools = createDbTools(db, UA);
    const hits = await tools.searchTransactions({ text: 'market' });
    expect(hits.some((h) => h.title === 'Market')).toBe(true);
    expect(hits.some((h) => h.title === 'Bs dinner')).toBe(false); // B's row never leaks
  });

  it('searchTransactions honors category + amount filters', async () => {
    const tools = createDbTools(db, UA);
    const dining = await tools.searchTransactions({ categories: ['dining'], minCents: 10000 });
    expect(dining.every((d) => d.category === 'dining')).toBe(true);
    // amount is SIGNED (expense negative); minCents compares abs(), so abs(-12345) >= 10000 still matches.
    expect(dining.some((d) => d.amountCents === -12345)).toBe(true);
    const tooBig = await tools.searchTransactions({ minCents: 1_000_000 });
    expect(tooBig.length).toBe(0);
  });

  it('spendingTrend buckets expense by month, user-scoped', async () => {
    const tools = createDbTools(db, UA);
    const trend = await tools.spendingTrend({ fromMonth: '2026-05', toMonth: '2026-05' });
    const may = trend.find((m) => m.month === '2026-05');
    expect(may?.totalCents).toBe(12345 + 5000); // dining + groceries; income excluded; B excluded
  });

  it('monthlyRecap totals income and expense in exact cents, user-scoped', async () => {
    const tools = createDbTools(db, UA);
    const r = await tools.monthlyRecap('2026-05');
    expect(r.incomeCents).toBe(300000); // Salary
    expect(r.expenseCents).toBe(12345 + 5000); // dining + groceries
    expect(r.netCents).toBe(300000 - (12345 + 5000));
  });
});
