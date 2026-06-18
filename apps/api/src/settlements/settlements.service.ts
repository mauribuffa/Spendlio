import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { and, desc, eq } from 'drizzle-orm';
import { people, settlements } from '@spendlio/db';
import type { DB as Database } from '@spendlio/db';
import type { CreateSettlementInput } from '@spendlio/contracts';
import { DB } from '../db/db.module';
import { resolveSelfPersonId } from '../common/self-person';

@Injectable()
export class SettlementsService {
  constructor(@Inject(DB) private db: Database) {}

  /** List the user's settlements, newest first. */
  async list(userId: string) {
    const items = await this.db
      .select()
      .from(settlements)
      .where(eq(settlements.userId, userId))
      .orderBy(desc(settlements.createdAt));
    return { items, nextCursor: null };
  }

  /**
   * Record a completed payment between the user and one friend (model B —
   * ADR-028). `direction` is from the user's viewpoint; the self-person is
   * resolved server-side and placed on the correct side of from/to. Written as
   * status='settled' (with settledAt) so the balance readers net it immediately.
   */
  async create(userId: string, dto: CreateSettlementInput) {
    // The counterparty must be one of the user's friends (never the self-person).
    const [friend] = await this.db
      .select({ id: people.id })
      .from(people)
      .where(and(eq(people.id, dto.personId), eq(people.userId, userId), eq(people.isSelf, false)))
      .limit(1);
    if (!friend) throw new BadRequestException('That person is not one of your people.');

    const selfId = await resolveSelfPersonId(this.db, userId);
    const [fromPersonId, toPersonId] =
      dto.direction === 'they_paid_you'
        ? [dto.personId, selfId] // a friend paid you
        : [selfId, dto.personId]; // you paid a friend

    const [row] = await this.db
      .insert(settlements)
      .values({
        userId,
        fromPersonId,
        toPersonId,
        amount: dto.amount,
        currency: dto.currency,
        status: 'settled',
        settledAt: new Date(),
      })
      .returning();
    return row;
  }
}
