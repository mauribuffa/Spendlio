import { describe, it, expect } from 'vitest';
import { AccountBalanceSchema } from './account';

describe('AccountBalanceSchema', () => {
  it('parses an account balance with a converted base value', () => {
    const parsed = AccountBalanceSchema.parse({
      accountId: '11111111-1111-1111-1111-111111111111',
      name: 'Galicia Pesos',
      type: 'checking',
      last4: '4821',
      currency: 'ARS',
      balance: -1234500,
      baseCurrency: 'USD',
      baseBalance: -1290,
      rateAsOf: '2026-06-14',
    });
    expect(parsed.balance).toBe(-1234500);
    expect(parsed.baseBalance).toBe(-1290);
  });

  it('allows a null converted balance when no FX rate exists', () => {
    const parsed = AccountBalanceSchema.parse({
      accountId: '22222222-2222-2222-2222-222222222222',
      name: 'Cash',
      type: 'cash',
      last4: null,
      currency: 'BRL',
      balance: 5000,
      baseCurrency: 'USD',
      baseBalance: null,
      rateAsOf: null,
    });
    expect(parsed.baseBalance).toBeNull();
    expect(parsed.rateAsOf).toBeNull();
  });

  it('rejects a non-integer balance (money must be minor units)', () => {
    expect(() =>
      AccountBalanceSchema.parse({
        accountId: '33333333-3333-3333-3333-333333333333',
        name: 'X', type: 'card', last4: null, currency: 'USD',
        balance: 12.5, baseCurrency: 'USD', baseBalance: 12, rateAsOf: null,
      }),
    ).toThrow();
  });
});
