import { and, eq } from 'drizzle-orm';
import { people } from '@spendlio/db';
import type { DB } from '@spendlio/db';

/**
 * The user's self-person id (the implicit "you" — model B, ADR-028). Lazily
 * created if missing; the partial unique index (people_one_self_per_user) makes
 * this race-safe (a concurrent insert hits onConflictDoNothing, then we
 * re-select). Used by any write that resolves the user to a person row.
 */
export async function resolveSelfPersonId(db: DB, userId: string): Promise<string> {
  const found = await getSelfPersonId(db, userId);
  if (found) return found;
  await db.insert(people).values({ userId, name: 'You', isSelf: true }).onConflictDoNothing();
  const [self] = await db
    .select({ id: people.id })
    .from(people)
    .where(and(eq(people.userId, userId), eq(people.isSelf, true)))
    .limit(1);
  return self!.id;
}

/** Read-only self-person lookup (null if none yet). For read paths that must not
 *  create rows as a side effect (e.g. the balances rollup). */
export async function getSelfPersonId(db: DB, userId: string): Promise<string | null> {
  const [self] = await db
    .select({ id: people.id })
    .from(people)
    .where(and(eq(people.userId, userId), eq(people.isSelf, true)))
    .limit(1);
  return self?.id ?? null;
}
