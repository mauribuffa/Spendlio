import { describe, it, expect } from 'vitest';
import { netBalances, type ShareInput, type SettlementInput } from './balances';

const SELF = 'self';
const noSettle: SettlementInput[] = [];

describe('netBalances (model B)', () => {
  it("a friend's split share means they owe you (positive)", () => {
    const shares: ShareInput[] = [{ personId: 'bob', amount: 500, currency: 'USD' }];
    const { net, currency } = netBalances(shares, noSettle, SELF);
    expect(net.get('bob')).toBe(500);
    expect(currency.get('bob')).toBe('USD');
  });

  it('skips the user’s own (self) share — it is not owed to anyone', () => {
    const shares: ShareInput[] = [
      { personId: SELF, amount: 400, currency: 'USD' },
      { personId: 'bob', amount: 600, currency: 'USD' },
    ];
    const { net } = netBalances(shares, noSettle, SELF);
    expect(net.has(SELF)).toBe(false);
    expect(net.get('bob')).toBe(600);
  });

  it('“they paid you” reduces what that friend owes you', () => {
    const shares: ShareInput[] = [{ personId: 'bob', amount: 500, currency: 'USD' }];
    // friend paid you 200 → to=self
    const settlements: SettlementInput[] = [{ fromPersonId: 'bob', toPersonId: SELF, amount: 200, currency: 'USD' }];
    expect(netBalances(shares, settlements, SELF).net.get('bob')).toBe(300);
  });

  it('“you paid them” credits the friend (you owe them less / they owe you more)', () => {
    // you paid alice 600 → from=self. With no prior share this reads as alice +600.
    const settlements: SettlementInput[] = [{ fromPersonId: SELF, toPersonId: 'alice', amount: 600, currency: 'USD' }];
    expect(netBalances([], settlements, SELF).net.get('alice')).toBe(600);
  });

  it('a full settlement clears the balance to zero (dropped from the map)', () => {
    const shares: ShareInput[] = [{ personId: 'bob', amount: 750, currency: 'USD' }];
    const settlements: SettlementInput[] = [{ fromPersonId: 'bob', toPersonId: SELF, amount: 750, currency: 'USD' }];
    const { net } = netBalances(shares, settlements, SELF);
    expect(net.has('bob')).toBe(false); // zero balances are dropped
  });

  it('ignores a settlement that involves neither the user (not a model-B settlement)', () => {
    const settlements: SettlementInput[] = [{ fromPersonId: 'alice', toPersonId: 'bob', amount: 999, currency: 'USD' }];
    expect(netBalances([], settlements, SELF).net.size).toBe(0);
  });

  it('drops the self id even if it appears in shares', () => {
    const shares: ShareInput[] = [{ personId: SELF, amount: 100, currency: 'USD' }];
    expect(netBalances(shares, noSettle, SELF).net.has(SELF)).toBe(false);
  });

  it('tracks each person’s currency from the first row that mentions them', () => {
    const shares: ShareInput[] = [{ personId: 'bob', amount: 500, currency: 'EUR' }];
    expect(netBalances(shares, noSettle, SELF).currency.get('bob')).toBe('EUR');
  });
});
