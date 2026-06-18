import './env'; // load repo-root .env before ./client creates the pg Pool
import { db, pool } from './client';
import {
  users,
  categories,
  accounts,
  budgets,
  people,
  groups,
  groupMembers,
  transactions,
  splits,
  splitShares,
  settlements,
} from './schema';

// The demo user's UUID is FIXED — the API dev AuthGuard defaults to it.
const DEMO_USER_ID = '00000000-0000-0000-0000-000000000001';

// All demo rows carry FIXED UUIDs so re-seeding is idempotent on the PK
// (every insert uses onConflictDoNothing). Namespaced by the 4th group:
//   0001 categories · 0002 accounts · 0003 people · 0004 groups
//   0005 group_members · 0006 transactions · 0007 budgets
//   0008 splits · 0009 split_shares · 000a settlements
const id = (group: string, n: string) => `00000000-0000-0000-${group}-0000000000${n}`;

// Built-in categories carry FIXED UUIDs so re-seeding is idempotent on the PK.
// keys match CategoryKey (packages/contracts/src/enums.ts) EXACTLY.
// icon = lucide-react icon name; color = hex. kind: income/transfer for those two, else expense.
type SeedCategory = {
  id: string;
  key: string;
  label: string;
  kind: 'expense' | 'income' | 'transfer';
  icon: string;
  color: string;
};

const DEFAULT_CATEGORIES: SeedCategory[] = [
  { id: '00000000-0000-0000-0001-000000000001', key: 'groceries',     label: 'Groceries',     kind: 'expense',  icon: 'shopping-cart', color: '#1B7A55' },
  { id: '00000000-0000-0000-0001-000000000002', key: 'dining',        label: 'Dining',        kind: 'expense',  icon: 'utensils',      color: '#C24A3E' },
  { id: '00000000-0000-0000-0001-000000000003', key: 'transport',     label: 'Transport',     kind: 'expense',  icon: 'car',           color: '#2F6FB3' },
  { id: '00000000-0000-0000-0001-000000000004', key: 'housing',       label: 'Housing',       kind: 'expense',  icon: 'home',          color: '#8B5E3C' },
  { id: '00000000-0000-0000-0001-000000000005', key: 'utilities',     label: 'Utilities',     kind: 'expense',  icon: 'plug',          color: '#5B6770' },
  { id: '00000000-0000-0000-0001-000000000006', key: 'shopping',      label: 'Shopping',      kind: 'expense',  icon: 'shopping-bag',  color: '#A14EB0' },
  { id: '00000000-0000-0000-0001-000000000007', key: 'health',        label: 'Health',        kind: 'expense',  icon: 'heart-pulse',   color: '#D0596B' },
  { id: '00000000-0000-0000-0001-000000000008', key: 'entertainment', label: 'Entertainment', kind: 'expense',  icon: 'clapperboard',  color: '#E08A1E' },
  { id: '00000000-0000-0000-0001-000000000009', key: 'travel',        label: 'Travel',        kind: 'expense',  icon: 'plane',         color: '#1F9AA8' },
  { id: '00000000-0000-0000-0001-00000000000a', key: 'subscriptions', label: 'Subscriptions', kind: 'expense',  icon: 'repeat',        color: '#6C5CE0' },
  { id: '00000000-0000-0000-0001-00000000000b', key: 'income',        label: 'Income',        kind: 'income',   icon: 'banknote',      color: '#1B6E4F' },
  { id: '00000000-0000-0000-0001-00000000000c', key: 'transfer',      label: 'Transfer',      kind: 'transfer', icon: 'arrow-left-right', color: '#5B6770' },
];

// ---- Accounts (all USD; balances are derived from the transactions below) ----
const ACCT = { checking: id('0002', '01'), card: id('0002', '02'), savings: id('0002', '03'), cash: id('0002', '04') };
const DEMO_ACCOUNTS = [
  { id: ACCT.checking, name: 'Everyday Checking', type: 'checking', currency: 'USD', institution: 'Mercury Bank', last4: '4291' },
  { id: ACCT.card,     name: 'Sapphire Card',     type: 'card',     currency: 'USD', institution: 'Chase',        last4: '7782' },
  { id: ACCT.savings,  name: 'Rainy Day Savings', type: 'savings',  currency: 'USD', institution: 'Ally',         last4: '0148' },
  { id: ACCT.cash,     name: 'Cash',              type: 'cash',     currency: 'USD', institution: null,           last4: null },
];

// ---- People (friends you split with) + the implicit "you" (isSelf, hidden from GET /people) ----
const SELF = id('0003', '0f');
const P = { alex: id('0003', '01'), maya: id('0003', '02'), sam: id('0003', '03'), ari: id('0003', '04') };
const DEMO_PEOPLE = [
  { id: P.alex, name: 'Alex Rivera', email: 'alex@example.com', isSelf: false },
  { id: P.maya, name: 'Maya Okafor', email: 'maya@example.com', isSelf: false },
  { id: P.sam,  name: 'Sam Reed',    email: 'sam@example.com',  isSelf: false },
  { id: P.ari,  name: 'Ari Cohen',   email: 'ari@example.com',  isSelf: false },
  { id: SELF,   name: 'You',         email: null,               isSelf: true  },
];

// ---- Groups + membership ----
const G = { roommates: id('0004', '01'), lisbon: id('0004', '02'), olio: id('0004', '03') };
const DEMO_GROUPS = [
  { id: G.roommates, name: 'Roommates' },
  { id: G.lisbon,    name: 'Trip to Lisbon' },
  { id: G.olio,      name: 'Dinner · Olio' },
];
const DEMO_GROUP_MEMBERS = [
  { id: id('0005', '01'), groupId: G.roommates, personId: P.alex },
  { id: id('0005', '02'), groupId: G.roommates, personId: P.maya },
  { id: id('0005', '03'), groupId: G.roommates, personId: P.ari },
  { id: id('0005', '04'), groupId: G.lisbon,    personId: P.alex },
  { id: id('0005', '05'), groupId: G.lisbon,    personId: P.maya },
  { id: id('0005', '06'), groupId: G.lisbon,    personId: P.sam },
  { id: id('0005', '07'), groupId: G.olio,      personId: P.alex },
  { id: id('0005', '08'), groupId: G.olio,      personId: P.sam },
];

// ---- Splits (model B: SELF is the implicit payer/creditor; friends owe their share) ----
const S = { olio: id('0008', '01'), lisbon: id('0008', '02') };
const TXN = { olio: id('0006', '10'), lisbon: id('0006', '11') };

// ---- Transactions (USD, integer cents; negative = expense). Mix of statuses + accounts. ----
const d = (iso: string) => new Date(iso);
type SeedTxn = {
  id: string; title: string; merchant: string | null; amount: number; category: string;
  accountId: string; status: string; source?: string; occurredAt: Date; splitId?: string;
};
const DEMO_TXNS: SeedTxn[] = [
  // June 2026 — current month
  { id: id('0006', '01'), title: 'Paycheck',         merchant: 'Acme Corp',         amount:  420000, category: 'income',        accountId: ACCT.checking, status: 'income',    source: 'recurring', occurredAt: d('2026-06-01T09:00:00Z') },
  { id: id('0006', '02'), title: 'Rent',             merchant: 'Sunset Apartments', amount: -165000, category: 'housing',       accountId: ACCT.checking, status: 'recurring', source: 'recurring', occurredAt: d('2026-06-01T12:00:00Z') },
  { id: id('0006', '03'), title: 'Electric bill',    merchant: 'City Power',        amount:   -8450, category: 'utilities',     accountId: ACCT.checking, status: 'recurring', source: 'recurring', occurredAt: d('2026-06-05T15:00:00Z') },
  { id: id('0006', '04'), title: 'Move to savings',  merchant: 'Transfer',          amount:  -50000, category: 'transfer',      accountId: ACCT.checking, status: 'cleared',                       occurredAt: d('2026-06-02T10:00:00Z') },
  { id: id('0006', '05'), title: 'From checking',    merchant: 'Transfer',          amount:   50000, category: 'transfer',      accountId: ACCT.savings,  status: 'cleared',                       occurredAt: d('2026-06-02T10:00:00Z') },
  { id: id('0006', '06'), title: 'Interest',         merchant: 'Ally',              amount:    1230, category: 'income',        accountId: ACCT.savings,  status: 'income',                        occurredAt: d('2026-06-01T08:00:00Z') },
  { id: id('0006', '07'), title: 'Whole Foods',      merchant: 'Whole Foods',       amount:   -8240, category: 'groceries',     accountId: ACCT.card,     status: 'cleared',                       occurredAt: d('2026-06-12T18:30:00Z') },
  { id: id('0006', '08'), title: "Trader Joe's",     merchant: "Trader Joe's",      amount:   -5410, category: 'groceries',     accountId: ACCT.card,     status: 'cleared',                       occurredAt: d('2026-06-06T17:10:00Z') },
  { id: id('0006', '09'), title: 'Morning coffee',   merchant: 'Blue Bottle',       amount:    -575, category: 'dining',        accountId: ACCT.card,     status: 'cleared',                       occurredAt: d('2026-06-14T08:20:00Z') },
  { id: id('0006', '0a'), title: 'Uber',             merchant: 'Uber',              amount:   -2330, category: 'transport',     accountId: ACCT.card,     status: 'cleared',                       occurredAt: d('2026-06-10T22:00:00Z') },
  { id: id('0006', '0b'), title: 'Netflix',          merchant: 'Netflix',           amount:   -1599, category: 'subscriptions', accountId: ACCT.card,     status: 'recurring', source: 'recurring', occurredAt: d('2026-06-03T00:00:00Z') },
  { id: id('0006', '0c'), title: 'Spotify',          merchant: 'Spotify',           amount:   -1199, category: 'subscriptions', accountId: ACCT.card,     status: 'recurring', source: 'recurring', occurredAt: d('2026-06-03T00:00:00Z') },
  { id: id('0006', '0d'), title: 'Amazon order',     merchant: 'Amazon',            amount:   -6320, category: 'shopping',      accountId: ACCT.card,     status: 'pending',                       occurredAt: d('2026-06-14T13:45:00Z') },
  { id: id('0006', '0e'), title: 'Pharmacy',         merchant: 'CVS',               amount:   -2840, category: 'health',        accountId: ACCT.card,     status: 'cleared',                       occurredAt: d('2026-06-09T11:00:00Z') },
  { id: id('0006', '0f'), title: 'Movie night',      merchant: 'AMC',               amount:   -3200, category: 'entertainment', accountId: ACCT.card,     status: 'cleared',                       occurredAt: d('2026-06-08T20:00:00Z') },
  { id: TXN.olio,         title: 'Dinner at Olio',   merchant: 'Olio',              amount:   -9600, category: 'dining',        accountId: ACCT.card,     status: 'split',                         occurredAt: d('2026-06-13T20:30:00Z'), splitId: S.olio },
  { id: TXN.lisbon,       title: 'Flights to Lisbon',merchant: 'TAP Air',           amount:  -42000, category: 'travel',        accountId: ACCT.card,     status: 'split',                         occurredAt: d('2026-06-07T07:00:00Z'), splitId: S.lisbon },
  { id: id('0006', '12'), title: 'Farmers market',   merchant: null,                amount:   -1800, category: 'groceries',     accountId: ACCT.cash,     status: 'cleared',                       occurredAt: d('2026-06-11T10:00:00Z') },
  { id: id('0006', '13'), title: 'Lunch (cash)',     merchant: null,                amount:   -2250, category: 'dining',        accountId: ACCT.cash,     status: 'cleared',                       occurredAt: d('2026-06-07T13:00:00Z') },
  // May 2026 — last month, for recap/history
  { id: id('0006', '20'), title: 'Paycheck',         merchant: 'Acme Corp',         amount:  420000, category: 'income',        accountId: ACCT.checking, status: 'income',    source: 'recurring', occurredAt: d('2026-05-01T09:00:00Z') },
  { id: id('0006', '21'), title: 'Rent',             merchant: 'Sunset Apartments', amount: -165000, category: 'housing',       accountId: ACCT.checking, status: 'recurring', source: 'recurring', occurredAt: d('2026-05-01T12:00:00Z') },
  { id: id('0006', '22'), title: 'Groceries',        merchant: 'Whole Foods',       amount:   -9120, category: 'groceries',     accountId: ACCT.card,     status: 'cleared',                       occurredAt: d('2026-05-15T18:00:00Z') },
  { id: id('0006', '23'), title: 'Dinner out',       merchant: 'Nopa',              amount:   -6740, category: 'dining',        accountId: ACCT.card,     status: 'cleared',                       occurredAt: d('2026-05-20T20:00:00Z') },
];

// ---- Budgets (monthly, USD) ----
const DEMO_BUDGETS = [
  { id: id('0007', '01'), category: 'groceries',     limit: 40000, currency: 'USD', period: 'monthly' },
  { id: id('0007', '02'), category: 'dining',        limit: 25000, currency: 'USD', period: 'monthly' },
  { id: id('0007', '03'), category: 'transport',     limit: 12000, currency: 'USD', period: 'monthly' },
  { id: id('0007', '04'), category: 'entertainment', limit:  8000, currency: 'USD', period: 'monthly' },
  { id: id('0007', '05'), category: 'shopping',      limit: 20000, currency: 'USD', period: 'monthly' },
];

const DEMO_SPLITS = [
  { id: S.olio,   transactionId: TXN.olio,   groupId: G.olio,   mode: 'even', total:  9600, currency: 'USD', payerId: SELF },
  { id: S.lisbon, transactionId: TXN.lisbon, groupId: G.lisbon, mode: 'even', total: 42000, currency: 'USD', payerId: SELF },
];
// SELF is included as a participant so the even split divides correctly and the
// remainder cent lands on the payer; balances() drops SELF and leaves friends owing.
const DEMO_SPLIT_SHARES = [
  { id: id('0009', '01'), splitId: S.olio,   personId: SELF,   amount: 3200 },
  { id: id('0009', '02'), splitId: S.olio,   personId: P.alex, amount: 3200 },
  { id: id('0009', '03'), splitId: S.olio,   personId: P.sam,  amount: 3200 },
  { id: id('0009', '04'), splitId: S.lisbon, personId: SELF,   amount: 10500 },
  { id: id('0009', '05'), splitId: S.lisbon, personId: P.alex, amount: 10500 },
  { id: id('0009', '06'), splitId: S.lisbon, personId: P.maya, amount: 10500 },
  { id: id('0009', '07'), splitId: S.lisbon, personId: P.sam,  amount: 10500 },
];
// Maya paid you back her Lisbon share → her net clears to "Settled up".
// Settlement edge nets toPersonId owes fromPersonId, so SELF receives from Maya.
const DEMO_SETTLEMENTS = [
  { id: id('000a', '01'), fromPersonId: P.maya, toPersonId: SELF, amount: 10500, currency: 'USD', status: 'settled', settledAt: d('2026-06-14T16:00:00Z') },
];

async function seed() {
  // 1) demo user (fixed UUID; AuthGuard default in dev)
  await db
    .insert(users)
    .values({
      id: DEMO_USER_ID,
      name: 'Demo',
      email: 'demo@spendlio.app',
      defaultCurrency: 'USD',
      // Pre-onboarded so the seeded demo experience skips the onboarding gate.
      onboardedAt: new Date(),
    })
    .onConflictDoNothing();

  // 2) the 12 built-in categories (userId null = shared default)
  await db
    .insert(categories)
    .values(
      DEFAULT_CATEGORIES.map((c) => ({
        id: c.id,
        key: c.key,
        label: c.label,
        kind: c.kind,
        icon: c.icon,
        color: c.color,
        isDefault: true,
        userId: null,
      })),
    )
    .onConflictDoNothing();

  // 3) accounts, people, groups + membership
  await db.insert(accounts).values(DEMO_ACCOUNTS.map((a) => ({ ...a, userId: DEMO_USER_ID }))).onConflictDoNothing();
  await db.insert(people).values(DEMO_PEOPLE.map((p) => ({ ...p, userId: DEMO_USER_ID }))).onConflictDoNothing();
  await db.insert(groups).values(DEMO_GROUPS.map((g) => ({ ...g, userId: DEMO_USER_ID }))).onConflictDoNothing();
  await db.insert(groupMembers).values(DEMO_GROUP_MEMBERS).onConflictDoNothing();

  // 4) transactions + budgets
  await db.insert(transactions).values(DEMO_TXNS.map((t) => ({ ...t, currency: 'USD', userId: DEMO_USER_ID }))).onConflictDoNothing();
  await db.insert(budgets).values(DEMO_BUDGETS.map((b) => ({ ...b, userId: DEMO_USER_ID }))).onConflictDoNothing();

  // 5) splits + shares + a settlement (drives the Split page balances)
  await db.insert(splits).values(DEMO_SPLITS.map((s) => ({ ...s, userId: DEMO_USER_ID }))).onConflictDoNothing();
  await db.insert(splitShares).values(DEMO_SPLIT_SHARES).onConflictDoNothing();
  await db.insert(settlements).values(DEMO_SETTLEMENTS.map((s) => ({ ...s, userId: DEMO_USER_ID }))).onConflictDoNothing();

  console.log(
    `Seeded demo user (${DEMO_USER_ID}): ${DEFAULT_CATEGORIES.length} categories, ` +
      `${DEMO_ACCOUNTS.length} accounts, ${DEMO_PEOPLE.length} people, ${DEMO_GROUPS.length} groups, ` +
      `${DEMO_TXNS.length} transactions, ${DEMO_BUDGETS.length} budgets, ${DEMO_SPLITS.length} splits, ` +
      `${DEMO_SETTLEMENTS.length} settlement.`,
  );
}

seed()
  .then(() => pool.end())
  .catch(async (err) => {
    console.error(err);
    await pool.end();
    process.exit(1);
  });
