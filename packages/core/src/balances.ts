// Model-B net balances (ADR-028/039). The user is implicit, represented by the
// self-person `selfId`; balances are per-friend from the user's viewpoint:
//   positive = they owe you, negative = you owe them.
// This is the SINGLE source of balance truth — both SplitsService.balances()
// (the API/Split page) and @spendlio/ai's balancesSummary (the assistant) feed
// it the same rows, so the two views can never disagree.

export interface ShareInput {
  /** The person who holds this split share. */
  personId: string;
  /** Minor units this person owes the user for the split. */
  amount: number;
  currency: string;
}

export interface SettlementInput {
  /** A settled payment. In model B exactly one side is the self-person. */
  fromPersonId: string;
  toPersonId: string;
  amount: number; // minor units
  currency: string;
}

/**
 * Reduce split shares + settled settlements to a per-friend net balance.
 *  - each friend's share → they owe you (+amount); the user's own (self) share is skipped.
 *  - "they paid you"  (settlement to=self)   → that friend owes you less (−amount).
 *  - "you paid them"  (settlement from=self)  → you owe that friend less (+amount).
 *  - a settlement involving neither self isn't a model-B settlement → ignored.
 * `selfId` is removed from the result and zero balances are dropped.
 */
export function netBalances(
  shares: ShareInput[],
  settlements: SettlementInput[],
  selfId: string,
): { net: Map<string, number>; currency: Map<string, string> } {
  const net = new Map<string, number>();
  const currency = new Map<string, string>();
  const bump = (id: string, d: number) => net.set(id, (net.get(id) ?? 0) + d);
  const setCur = (id: string, c: string) => {
    if (!currency.has(id)) currency.set(id, c);
  };

  for (const s of shares) {
    if (s.personId === selfId) continue; // the user's own share isn't owed to anyone
    bump(s.personId, s.amount);
    setCur(s.personId, s.currency);
  }

  for (const st of settlements) {
    if (st.toPersonId === selfId) {
      bump(st.fromPersonId, -st.amount); // a friend paid you
      setCur(st.fromPersonId, st.currency);
    } else if (st.fromPersonId === selfId) {
      bump(st.toPersonId, st.amount); // you paid a friend
      setCur(st.toPersonId, st.currency);
    }
  }

  net.delete(selfId);
  for (const [id, v] of net) if (v === 0) net.delete(id);
  return { net, currency };
}
