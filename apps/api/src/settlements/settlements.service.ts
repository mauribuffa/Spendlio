import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { and, desc, eq, inArray } from 'drizzle-orm';
import { people, settlements } from '@spendlio/db';
import type { CreateSettlementInput } from '@spendlio/contracts';
import { DB } from '../db/db.module';

@Injectable()
export class SettlementsService {
  constructor(@Inject(DB) private db: any) {}

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
   * Record a completed payment: from one of the user's people to another.
   * Written as status='settled' (with settledAt) so SplitsService.balances()
   * — which counts only settled rows — nets it immediately. v1 records full
   * named payments only; partial/pending settlements are out of scope.
   */
  async create(userId: string, dto: CreateSettlementInput) {
    if (dto.fromPersonId === dto.toPersonId) {
      throw new BadRequestException('A payment must be between two different people.');
    }
    if (dto.amount <= 0) {
      throw new BadRequestException('Amount must be positive.');
    }

    // Both people must belong to this user (id-only payload, scoped check).
    const owned = await this.db
      .select({ id: people.id })
      .from(people)
      .where(and(eq(people.userId, userId), inArray(people.id, [dto.fromPersonId, dto.toPersonId])));
    const ownedIds = new Set(owned.map((p: { id: string }) => p.id));
    if (!ownedIds.has(dto.fromPersonId) || !ownedIds.has(dto.toPersonId)) {
      throw new BadRequestException('Both people must belong to you.');
    }

    const [row] = await this.db
      .insert(settlements)
      .values({
        userId,
        fromPersonId: dto.fromPersonId,
        toPersonId: dto.toPersonId,
        amount: dto.amount,
        currency: dto.currency,
        status: 'settled',
        settledAt: new Date(),
      })
      .returning();
    return row;
  }
}
