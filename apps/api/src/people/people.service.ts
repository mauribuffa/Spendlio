import { Inject, Injectable } from '@nestjs/common';
import { and, desc, eq } from 'drizzle-orm';
import { people, notifications } from '@spendlio/db';
import type { DB as Database } from '@spendlio/db';
import type { CreatePersonInput } from '@spendlio/contracts';
import { DB } from '../db/db.module';
import { or404 } from '../common/or404';

@Injectable()
export class PeopleService {
  constructor(@Inject(DB) private db: Database) {}

  /** Friends the user splits with. The implicit "you" person (isSelf, the
   *  model-B split payer/viewpoint — ADR-021) is never listed. */
  async list(userId: string) {
    const items = await this.db.select().from(people)
      .where(and(eq(people.userId, userId), eq(people.isSelf, false)))
      .orderBy(desc(people.createdAt));
    return { items, nextCursor: null };
  }

  async create(userId: string, dto: CreatePersonInput) {
    const [row] = await this.db.insert(people).values({ ...dto, userId }).returning();
    return row;
  }

  /**
   * Nudge a person to settle up. We have no email/push transport yet, so this
   * records an in-app `settle_reminder` notification for the user (the same
   * table the notify worker writes to). Synchronous: it's a direct user action,
   * not background work. Delivery to the person lands when that infra exists.
   */
  async remind(userId: string, personId: string) {
    const [row] = await this.db
      .select({ id: people.id, name: people.name })
      .from(people)
      .where(and(eq(people.id, personId), eq(people.userId, userId), eq(people.isSelf, false)));
    const person = or404(row);

    await this.db.insert(notifications).values({
      userId,
      type: 'settle_reminder',
      title: 'Reminder sent',
      body: `You nudged ${person.name} to settle up.`,
      data: { kind: 'settle_reminder', personId },
    });
    return { ok: true };
  }
}
