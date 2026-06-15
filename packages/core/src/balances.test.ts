import { describe, it, expect } from 'vitest';
import { netForUser, type Edge } from './balances';

describe('netForUser', () => {
  it('reports a positive balance for someone who owes you', () => {
    const edges: Edge[] = [{ debtorId: 'bob', creditorId: 'me', amount: 500 }];
    const net = netForUser(edges, 'me');
    expect(net.get('bob')).toBe(500); // positive = bob owes you
  });

  it('reports a negative balance for someone you owe', () => {
    const edges: Edge[] = [{ debtorId: 'me', creditorId: 'alice', amount: 750 }];
    const net = netForUser(edges, 'me');
    expect(net.get('alice')).toBe(-750); // negative = you owe alice
  });

  it('nets a small who-owes-whom graph from one viewpoint', () => {
    // bob owes me 500, I owe alice 750, carol owes me 200, I owe bob 100.
    const edges: Edge[] = [
      { debtorId: 'bob', creditorId: 'me', amount: 500 },
      { debtorId: 'me', creditorId: 'alice', amount: 750 },
      { debtorId: 'carol', creditorId: 'me', amount: 200 },
      { debtorId: 'me', creditorId: 'bob', amount: 100 },
    ];
    const net = netForUser(edges, 'me');
    expect(net.get('bob')).toBe(400);   // +500 (owes me) - 100 (I owe bob) = 400 net to me
    expect(net.get('alice')).toBe(-750); // I owe alice
    expect(net.get('carol')).toBe(200);  // carol owes me
  });

  it('ignores edges that do not involve me', () => {
    const edges: Edge[] = [{ debtorId: 'alice', creditorId: 'bob', amount: 999 }];
    const net = netForUser(edges, 'me');
    expect(net.size).toBe(0);
  });

  it('settles to zero when mutual debts cancel out', () => {
    const edges: Edge[] = [
      { debtorId: 'me', creditorId: 'bob', amount: 300 },
      { debtorId: 'bob', creditorId: 'me', amount: 300 },
    ];
    const net = netForUser(edges, 'me');
    expect(net.get('bob')).toBe(0);
  });

  it('conserves total: the sum of my net balances across people equals my overall position', () => {
    const edges: Edge[] = [
      { debtorId: 'bob', creditorId: 'me', amount: 500 },
      { debtorId: 'me', creditorId: 'alice', amount: 200 },
      { debtorId: 'carol', creditorId: 'me', amount: 125 },
    ];
    const net = netForUser(edges, 'me');
    const overall = [...net.values()].reduce((t, x) => t + x, 0);
    expect(overall).toBe(500 - 200 + 125); // +425 net to me
  });
});

describe('netForUser — settlements net against a debt', () => {
  it('a payment reverse-edge reduces what I owe', () => {
    // I owe alice 1000 (from a split where alice paid). A settlement where I (me)
    // pay alice 600 is modeled as a reverse edge debtor=alice creditor=me.
    const edges: Edge[] = [
      { debtorId: 'me', creditorId: 'alice', amount: 1000 }, // split: I owe alice
      { debtorId: 'alice', creditorId: 'me', amount: 600 },  // settlement: I paid alice 600
    ];
    const net = netForUser(edges, 'me');
    expect(net.get('alice')).toBe(-400); // still owe 400 after paying 600
  });

  it('a full settlement clears the balance to zero', () => {
    const edges: Edge[] = [
      { debtorId: 'me', creditorId: 'bob', amount: 750 },
      { debtorId: 'bob', creditorId: 'me', amount: 750 },
    ];
    expect(netForUser(edges, 'me').get('bob')).toBe(0);
  });
});
