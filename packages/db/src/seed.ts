import { db, pool } from './client';
import { users, categories } from './schema';

// The demo user's UUID is FIXED — the API dev AuthGuard defaults to it.
const DEMO_USER_ID = '00000000-0000-0000-0000-000000000001';

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

async function seed() {
  // 1) demo user (fixed UUID; AuthGuard default in dev)
  await db
    .insert(users)
    .values({
      id: DEMO_USER_ID,
      name: 'Demo',
      email: 'demo@spendlio.app',
      defaultCurrency: 'USD',
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

  console.log(`Seeded demo user (${DEMO_USER_ID}) and ${DEFAULT_CATEGORIES.length} default categories.`);
}

seed()
  .then(() => pool.end())
  .catch(async (err) => {
    console.error(err);
    await pool.end();
    process.exit(1);
  });
