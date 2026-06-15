import { describe, it, expect } from 'vitest';
import {
  TransactionSchema,
  CreateTransactionInput,
  toMinorUnits,
  formatMoney,
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
