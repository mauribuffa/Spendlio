import { describe, it, expect, afterEach } from 'vitest';
import { categorizeByRules } from './rules';
import { OfflineProvider } from './offline';
import { LazyLiveProvider } from './live/lazy';
import { parseIntent } from './offline/intent';
import { getProvider } from './index';
import type { AssistantTools } from './provider';

describe('rules categorizer', () => {
  it('maps known merchants to the right category', () => {
    expect(categorizeByRules({ title: 'BLUE BOTTLE COFFEE' })).toBe('dining');
    expect(categorizeByRules({ title: 'Uber trip', merchant: 'Uber' })).toBe('transport');
    expect(categorizeByRules({ title: 'Groceries', merchant: 'Whole Foods Market' })).toBe('groceries');
    expect(categorizeByRules({ title: 'Monthly rent' })).toBe('housing');
    expect(categorizeByRules({ title: 'Electric bill' })).toBe('utilities');
    expect(categorizeByRules({ title: 'Order', merchant: 'Amazon' })).toBe('shopping');
    expect(categorizeByRules({ title: 'CVS Pharmacy' })).toBe('health');
    expect(categorizeByRules({ title: 'Netflix' })).toBe('subscriptions');
    expect(categorizeByRules({ title: 'Flight to NYC' })).toBe('travel');
    expect(categorizeByRules({ title: 'Movie night', merchant: 'AMC Cinema' })).toBe('entertainment');
    expect(categorizeByRules({ title: 'ACME Payroll deposit' })).toBe('income');
  });

  it('returns null for an unknown merchant (escalate to LLM)', () => {
    expect(categorizeByRules({ title: 'Zorblax Industries LLC' })).toBeNull();
    expect(categorizeByRules({ title: 'qwxyz' })).toBeNull();
  });
});

describe('intent parsing', () => {
  it('parses "dining" + "May" into a spendByCategory intent', () => {
    const fixedNow = new Date('2026-06-15T00:00:00.000Z');
    const intent = parseIntent('How much did I spend on dining in May?', fixedNow);
    expect(intent).toEqual({ kind: 'spendByCategory', category: 'dining', monthName: 'May', month: '2026-05' });
  });
});

describe('OfflineProvider.chat', () => {
  // Stub tools returning fixed integer cents — the model never does math.
  const stubTools: AssistantTools = {
    async spendByCategory(month) {
      expect(month).toMatch(/^\d{4}-05$/); // resolved "May"
      return [
        { category: 'dining', amountCents: 12345 }, // $123.45
        { category: 'groceries', amountCents: 50000 },
      ];
    },
    async budgetStatus() {
      return [{ category: 'dining', limitCents: 20000, spentCents: 12345, remainingCents: 7655 }];
    },
    async recentTransactions() {
      return [];
    },
    async balancesSummary() {
      return [];
    },
  };

  it('answers "how much on dining in May?" with the exact formatted figure', async () => {
    const provider = new OfflineProvider();
    const result = await provider.chat({
      messages: [{ role: 'user', content: 'How much did I spend on dining in May?' }],
      tools: stubTools,
    });
    expect(result.answer).toBe('You spent $123.45 on dining in May.');
    expect(result.usedTools).toEqual(['spendByCategory']);
  });

  it('streamChat replays the same answer over textStream and resolves usedTools', async () => {
    const provider = new OfflineProvider();
    const stream = provider.streamChat({
      messages: [{ role: 'user', content: 'How much did I spend on dining in May?' }],
      tools: stubTools,
    });
    let text = '';
    for await (const delta of stream.textStream) text += delta;
    expect(text).toBe('You spent $123.45 on dining in May.');
    expect(await stream.usedTools()).toEqual(['spendByCategory']);
    // The endpoint serves this as an SSE Response for the useChat hook.
    expect(stream.toUIMessageStreamResponse()).toBeInstanceOf(Response);
  });
});

describe('OfflineProvider.extractReceipt', () => {
  it('returns a schema-valid mock receipt with confidence in [0,1]', async () => {
    const provider = new OfflineProvider();
    const r = await provider.extractReceipt({ key: 'receipts/demo.jpg' });
    expect(r.currency).toBe('USD');
    expect(Number.isInteger(r.total)).toBe(true);
    expect(r.confidence).toBeGreaterThanOrEqual(0);
    expect(r.confidence).toBeLessThanOrEqual(1);
    expect(r.lineItems.length).toBeGreaterThan(0);
  });
});

describe('getProvider', () => {
  const KEYS = ['ANTHROPIC_API_KEY', 'OPENAI_API_KEY', 'AI_PROVIDER'] as const;
  const original = Object.fromEntries(KEYS.map((k) => [k, process.env[k]]));
  afterEach(() => {
    for (const k of KEYS) {
      if (original[k] === undefined) delete process.env[k];
      else process.env[k] = original[k];
    }
  });

  it('returns the OfflineProvider when no AI key is configured', () => {
    for (const k of KEYS) delete process.env[k];
    expect(getProvider()).toBeInstanceOf(OfflineProvider);
  });

  it('returns the LazyLiveProvider when ANTHROPIC_API_KEY is set', () => {
    for (const k of KEYS) delete process.env[k];
    process.env.ANTHROPIC_API_KEY = 'sk-test';
    expect(getProvider()).toBeInstanceOf(LazyLiveProvider);
  });
});

describe('LazyLiveProvider runtime boundary', () => {
  // The whole point of the lazy seam: consumers don't typecheck ./live, but the
  // module must still load at runtime via the non-literal dynamic import().
  it('resolves the live module (LiveProvider) at runtime', async () => {
    const spec = './live/index';
    const m = await import(spec);
    expect(typeof m.LiveProvider).toBe('function');
  });
});
