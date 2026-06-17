import { describe, it, expect } from 'vitest';
import { ReceiptSchema } from './index';

const base = {
  id: '11111111-1111-1111-1111-111111111111',
  userId: '22222222-2222-2222-2222-222222222222',
  createdAt: '2026-06-17T00:00:00.000Z',
  updatedAt: '2026-06-17T00:00:00.000Z',
  imageKey: 'receipts/u/abc.jpg',
  status: 'parsed' as const,
};

describe('ReceiptSchema.category', () => {
  it('round-trips a category', () => {
    const r = ReceiptSchema.parse({ ...base, category: 'dining' });
    expect(r.category).toBe('dining');
  });

  it('accepts null', () => {
    const r = ReceiptSchema.parse({ ...base, category: null });
    expect(r.category).toBeNull();
  });

  it('is optional (absent is fine)', () => {
    const r = ReceiptSchema.parse(base);
    expect(r.category).toBeUndefined();
  });

  it('rejects an unknown category', () => {
    expect(() => ReceiptSchema.parse({ ...base, category: 'banana' })).toThrow();
  });
});
