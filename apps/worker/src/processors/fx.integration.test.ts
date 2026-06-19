import { afterAll, describe, expect, it } from 'vitest';
const RUN = Boolean(process.env.DATABASE_URL);

describe.skipIf(!RUN)('fx refresh (live DB, offline provider)', () => {
  it('upserts fx_rates for the demo USD base', async () => {
    const { db, fxRates, pool } = await import('@spendlio/db');
    const { processFxRefresh } = await import('./fx');
    const { eq } = await import('drizzle-orm');
    await processFxRefresh({ data: {} } as never);
    const rows = await db.select().from(fxRates).where(eq(fxRates.base, 'USD'));
    expect(rows.some((r) => r.quote === 'EUR')).toBe(true);
    await pool.end();
  });
});
