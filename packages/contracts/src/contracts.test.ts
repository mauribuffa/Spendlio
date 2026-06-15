import { describe, it, expect } from 'vitest';
import {
  TransactionSchema,
  CreateTransactionInput,
  toMinorUnits,
  formatMoney,
  CreateSettlementInput,
  SettlementSchema,
} from './index';

const sampleTransaction = {
  id: '11111111-1111-1111-1111-111111111111',
  userId: '22222222-2222-2222-2222-222222222222',
  title: 'Coffee',
  amount: 450, // $4.50
  currency: 'USD',
  category: 'dining',
  occurredAt: '2026-06-15T10:00:00.000Z',
  status: 'cleared',
  source: 'manual',
  createdAt: '2026-06-15T10:00:00.000Z',
  updatedAt: '2026-06-15T10:00:00.000Z',
};

describe('contracts', () => {
  it('parses a valid transaction', () => {
    const t = TransactionSchema.parse(sampleTransaction);
    expect(t.amount).toBe(450);
    expect(t.occurredAt).toBeInstanceOf(Date);
    expect(t.currency).toBe('USD');
  });

  it('rejects a non-integer (fractional) amount', () => {
    expect(() => CreateTransactionInput.parse({ ...sampleTransaction, amount: 1.5 })).toThrow();
  });

  it('money helpers: integer cents in, formatted string out', () => {
    expect(toMinorUnits(4.5, 'USD')).toBe(450);
    expect(toMinorUnits(1000, 'JPY')).toBe(1000); // 0-decimal currency
    expect(formatMoney({ amount: 450, currency: 'USD' })).toBe('$4.50');
  });
});

describe('settlement contract', () => {
  const personA = '33333333-3333-3333-3333-333333333333';
  const personB = '44444444-4444-4444-4444-444444444444';

  it('accepts a full named payment in integer cents', () => {
    const input = CreateSettlementInput.parse({
      fromPersonId: personA,
      toPersonId: personB,
      amount: 2500, // $25.00
      currency: 'usd', // CurrencyCode upper-cases
    });
    expect(input.amount).toBe(2500);
    expect(input.currency).toBe('USD');
  });

  it('rejects a fractional amount (money is integer minor units)', () => {
    expect(() =>
      CreateSettlementInput.parse({
        fromPersonId: personA,
        toPersonId: personB,
        amount: 25.5,
        currency: 'USD',
      }),
    ).toThrow();
  });

  it('does not accept status/settledAt on the create DTO (server sets them)', () => {
    const parsed = CreateSettlementInput.parse({
      fromPersonId: personA,
      toPersonId: personB,
      amount: 100,
      currency: 'USD',
      status: 'settled', // stripped by .omit()
    } as Record<string, unknown>);
    expect('status' in parsed).toBe(false);
  });

  it('SettlementSchema round-trips a settled row', () => {
    const row = SettlementSchema.parse({
      id: '11111111-1111-1111-1111-111111111111',
      userId: '22222222-2222-2222-2222-222222222222',
      fromPersonId: personA,
      toPersonId: personB,
      amount: 2500,
      currency: 'USD',
      status: 'settled',
      settledAt: '2026-06-15T10:00:00.000Z',
      createdAt: '2026-06-15T10:00:00.000Z',
      updatedAt: '2026-06-15T10:00:00.000Z',
    });
    expect(row.status).toBe('settled');
    expect(row.settledAt).toBeInstanceOf(Date);
  });
});
