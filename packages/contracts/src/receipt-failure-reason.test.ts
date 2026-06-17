import { describe, it, expect } from 'vitest';
import { ReceiptSchema, ReceiptFailureReason } from './index';

const base = {
  id: '11111111-1111-1111-1111-111111111111',
  userId: '22222222-2222-2222-2222-222222222222',
  createdAt: '2026-06-17T00:00:00.000Z',
  updatedAt: '2026-06-17T00:00:00.000Z',
  imageKey: 'receipts/u/abc.jpg',
  status: 'failed' as const,
};

describe('ReceiptFailureReason', () => {
  it('accepts the four reason codes', () => {
    expect(ReceiptFailureReason.options).toEqual([
      'timeout',
      'unreadable',
      'image_unavailable',
      'unknown',
    ]);
  });
});

describe('ReceiptSchema.failureReason', () => {
  it('round-trips a failure reason code', () => {
    const r = ReceiptSchema.parse({ ...base, failureReason: 'unreadable' });
    expect(r.failureReason).toBe('unreadable');
    expect(r.lineItems).toEqual([]);
  });

  it('is optional (absent is fine)', () => {
    const r = ReceiptSchema.parse(base);
    expect(r.failureReason).toBeUndefined();
  });

  it('accepts null', () => {
    const r = ReceiptSchema.parse({ ...base, failureReason: null });
    expect(r.failureReason).toBeNull();
  });

  it('rejects an unknown code', () => {
    expect(() => ReceiptSchema.parse({ ...base, failureReason: 'banana' })).toThrow();
  });
});
