import { describe, it, expect } from 'vitest';
import { ReceiptOcrResult } from './provider';

// OpenAI strict structured outputs require EVERY property to appear in the JSON
// schema's `required` array. The AI SDK emits a Zod field with `.default()` as
// NOT required, which OpenAI rejects ("Missing 'quantity'"). The OCR line item
// must therefore make `quantity` required — the contract's ReceiptLineItem keeps
// its lenient default for the confirm/storage paths.
describe('ReceiptOcrResult line items (OpenAI strict-output compatibility)', () => {
  const base = {
    merchant: 'Demo Market',
    date: '2026-06-01',
    total: 1899,
    currency: 'USD',
    confidence: 0.5,
    category: 'groceries',
  };

  it('requires quantity on each line item (no default), so it stays in the strict `required` set', () => {
    const missingQuantity = { ...base, lineItems: [{ description: 'Coffee', amount: 1299 }] };
    expect(ReceiptOcrResult.safeParse(missingQuantity).success).toBe(false);
  });

  it('accepts a fully-specified line item', () => {
    const ok = { ...base, lineItems: [{ description: 'Coffee', quantity: 1, amount: 1299 }] };
    expect(ReceiptOcrResult.safeParse(ok).success).toBe(true);
  });
});

describe('ReceiptOcrResult.category (OCR-suggested spending category)', () => {
  const withItems = {
    merchant: 'Demo Market',
    date: '2026-06-01',
    total: 1899,
    currency: 'USD',
    lineItems: [{ description: 'Coffee', quantity: 1, amount: 1299 }],
    confidence: 0.5,
  };

  it('accepts a valid CategoryKey', () => {
    const r = ReceiptOcrResult.parse({ ...withItems, category: 'groceries' });
    expect(r.category).toBe('groceries');
  });

  it('accepts null (model unsure)', () => {
    const r = ReceiptOcrResult.parse({ ...withItems, category: null });
    expect(r.category).toBeNull();
  });

  it('requires the category field to be present (strict-output safe)', () => {
    expect(ReceiptOcrResult.safeParse(withItems).success).toBe(false);
  });

  it('rejects a non-CategoryKey value', () => {
    expect(ReceiptOcrResult.safeParse({ ...withItems, category: 'banana' }).success).toBe(false);
  });
});
