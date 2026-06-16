import { describe, it, expect } from 'vitest';
import { advance, dueOccurrences } from './recurring';

describe('advance', () => {
  it('advances by each cadence in UTC', () => {
    const from = new Date('2026-01-31T00:00:00Z');
    expect(advance(from, 'daily').toISOString()).toBe('2026-02-01T00:00:00.000Z');
    expect(advance(from, 'weekly').toISOString()).toBe('2026-02-07T00:00:00.000Z');
    // Jan 31 + 1 month rolls into March (JS Date overflow) — documented behavior.
    expect(advance(from, 'monthly').toISOString()).toBe('2026-03-03T00:00:00.000Z');
    expect(advance(from, 'yearly').toISOString()).toBe('2027-01-31T00:00:00.000Z');
  });

  it('honors the interval', () => {
    const from = new Date('2026-01-01T00:00:00Z');
    expect(advance(from, 'daily', 10).toISOString()).toBe('2026-01-11T00:00:00.000Z');
  });
});

describe('dueOccurrences', () => {
  it('returns no due dates when nextRunAt is in the future', () => {
    const { due, nextRunAt } = dueOccurrences(
      new Date('2026-06-20T00:00:00Z'),
      new Date('2026-06-16T00:00:00Z'),
      'daily',
    );
    expect(due).toHaveLength(0);
    expect(nextRunAt.toISOString()).toBe('2026-06-20T00:00:00.000Z');
  });

  it('catches up every missed occurrence and advances nextRunAt past now', () => {
    const { due, nextRunAt } = dueOccurrences(
      new Date('2026-06-01T00:00:00Z'),
      new Date('2026-06-04T12:00:00Z'),
      'daily',
    );
    expect(due.map((d) => d.toISOString())).toEqual([
      '2026-06-01T00:00:00.000Z',
      '2026-06-02T00:00:00.000Z',
      '2026-06-03T00:00:00.000Z',
      '2026-06-04T00:00:00.000Z',
    ]);
    expect(nextRunAt.toISOString()).toBe('2026-06-05T00:00:00.000Z');
  });

  it('is bounded so a long-dormant rule cannot spawn unbounded occurrences', () => {
    const { due } = dueOccurrences(
      new Date('2000-01-01T00:00:00Z'),
      new Date('2026-06-16T00:00:00Z'),
      'daily',
      1,
      60,
    );
    expect(due).toHaveLength(60);
  });
});
