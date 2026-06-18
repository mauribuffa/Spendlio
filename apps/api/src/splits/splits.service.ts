import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { and, desc, eq, inArray, isNull } from 'drizzle-orm';
import { people, settlements, splits, splitShares } from '@spendlio/db';
import type { DB as Database } from '@spendlio/db';
import { computeSplit, netBalances, type Share, type ShareInput, type SettlementInput } from '@spendlio/core';
import type { Balance, CreateSplitInput } from '@spendlio/contracts';
import { DB } from '../db/db.module';
import { or404 } from '../common/or404';
import { resolveSelfPersonId, getSelfPersonId } from '../common/self-person';

@Injectable()
export class SplitsService {
  constructor(@Inject(DB) private db: Database) {}

  async list(userId: string) {
    const items = await this.db.select().from(splits)
      .where(and(eq(splits.userId, userId), isNull(splits.deletedAt)))
      .orderBy(desc(splits.createdAt));
    return { items, nextCursor: null };
  }

  /**
   * Create a split (model B — ADR-028): the user is the implicit payer/creditor,
   * resolved server-side to their self-person. `dto.total` is the FULL expense;
   * participants are friends only. Shares are computed over [self, ...friends]
   * with self absorbing the remainder, and the self share is stored too so the
   * rows reconcile to `total`. balances() / netBalances() skip the self share.
   */
  async create(userId: string, dto: CreateSplitInput) {
    const selfId = await this.resolveSelfId(userId);

    // IDOR guard: every participant must belong to this user and must not be the
    // self-person (the self share is injected here, never sent by the client).
    if (dto.participantIds.includes(selfId)) {
      throw new BadRequestException('Participants cannot include yourself.');
    }
    const owned = await this.db
      .select({ id: people.id })
      .from(people)
      .where(and(eq(people.userId, userId), eq(people.isSelf, false), inArray(people.id, dto.participantIds)));
    const ownedIds = new Set(owned.map((p) => p.id));
    if (dto.participantIds.some((id) => !ownedIds.has(id))) {
      throw new BadRequestException('Every participant must be one of your people.');
    }

    const personIds = [selfId, ...dto.participantIds];

    // Inject the self share explicitly (do NOT route self through weight(), which
    // throws on a missing key). Keep detail rows in lockstep with personIds.
    let detail: { exact?: Share[]; percents?: { personId: string; pct: number }[] } | undefined;
    if (dto.mode === 'exact') {
      const friends = dto.participantIds.map((id) => ({ personId: id, amount: this.weight(dto, id) }));
      const friendSum = friends.reduce((s, x) => s + x.amount, 0);
      detail = { exact: [{ personId: selfId, amount: dto.total - friendSum }, ...friends] };
    } else if (dto.mode === 'percent') {
      const friends = dto.participantIds.map((id) => ({ personId: id, pct: this.weight(dto, id) }));
      const friendPct = friends.reduce((s, x) => s + x.pct, 0);
      detail = { percents: [{ personId: selfId, pct: 100 - friendPct }, ...friends] };
    }

    let shares: Share[];
    try {
      shares = computeSplit(dto.mode, dto.total, personIds, selfId, detail);
    } catch (e) {
      throw new BadRequestException((e as Error).message);
    }

    const [split] = await this.db.insert(splits).values({
      userId,
      transactionId: dto.transactionId ?? null,
      groupId: dto.groupId ?? null,
      mode: dto.mode,
      total: dto.total,
      currency: dto.currency,
      payerId: selfId,
    }).returning();

    const sharesRows = await this.db.insert(splitShares).values(
      shares.map((s) => ({ splitId: split!.id, personId: s.personId, amount: s.amount })),
    ).returning();

    // Hide the self share from the client (presentation): friends only.
    return { ...split, shares: sharesRows.filter((s) => s.personId !== selfId) };
  }

  /** The user's self-person id (the implicit "you" — model B). Shared resolver
   *  (lazily created, race-safe) — see common/self-person.ts. */
  private resolveSelfId(userId: string): Promise<string> {
    return resolveSelfPersonId(this.db, userId);
  }

  async get(userId: string, id: string) {
    const [row] = await this.db.select().from(splits)
      .where(and(eq(splits.id, id), eq(splits.userId, userId), isNull(splits.deletedAt)));
    const split = or404(row);
    const shares = await this.db.select().from(splitShares).where(eq(splitShares.splitId, id));
    // The self share (split.payerId) is internal bookkeeping; the client sees friends only.
    return { ...split, shares: shares.filter((s) => s.personId !== split.payerId) };
  }

  async remove(userId: string, id: string) {
    await this.get(userId, id);
    await this.db.update(splits).set({ deletedAt: new Date() })
      .where(and(eq(splits.id, id), eq(splits.userId, userId)));
    return { ok: true };
  }

  /**
   * Net who-owes-whom per friend, from the user's viewpoint (+ they owe you).
   * Delegates the arithmetic to `core.netBalances` — the SINGLE source of balance
   * truth shared with `@spendlio/ai`'s balancesSummary, so the Split page and the
   * assistant can't disagree (ADR-039 follow-up). This method only fetches rows
   * and shapes the result; the self share is skipped inside core.
   */
  async balances(userId: string): Promise<Balance[]> {
    const selfId = await getSelfPersonId(this.db, userId);
    if (!selfId) return []; // no self-person ⇒ no splits/settlements to net

    const userSplits = await this.db
      .select({ id: splits.id, currency: splits.currency })
      .from(splits)
      .where(and(eq(splits.userId, userId), isNull(splits.deletedAt)));

    const splitIds = userSplits.map((s) => s.id);
    const currencyOf = new Map(userSplits.map((s) => [s.id, s.currency]));
    const shareRows = splitIds.length
      ? await this.db
          .select({ splitId: splitShares.splitId, personId: splitShares.personId, amount: splitShares.amount })
          .from(splitShares)
          .where(inArray(splitShares.splitId, splitIds))
      : [];

    const settled = await this.db
      .select({
        fromPersonId: settlements.fromPersonId,
        toPersonId: settlements.toPersonId,
        amount: settlements.amount,
        currency: settlements.currency,
      })
      .from(settlements)
      .where(and(eq(settlements.userId, userId), eq(settlements.status, 'settled')));

    const shares: ShareInput[] = shareRows.map((sh) => ({
      personId: sh.personId,
      amount: Number(sh.amount),
      currency: currencyOf.get(sh.splitId) ?? 'USD',
    }));
    const settlementInputs: SettlementInput[] = settled.map((st) => ({
      fromPersonId: st.fromPersonId,
      toPersonId: st.toPersonId,
      amount: Number(st.amount),
      currency: st.currency,
    }));

    const { net, currency } = netBalances(shares, settlementInputs, selfId);

    const personIds = [...net.keys()];
    if (personIds.length === 0) return [];
    const persons = await this.db
      .select({ id: people.id })
      .from(people)
      .where(and(eq(people.userId, userId), inArray(people.id, personIds)));
    const known = new Set(persons.map((p) => p.id));

    return personIds
      .filter((id) => known.has(id)) // only this user's people
      .map((id) => ({ personId: id, currency: currency.get(id) ?? 'USD', amount: net.get(id)! }));
  }

  private weight(dto: CreateSplitInput, id: string): number {
    const w = dto.weights?.[id];
    if (w === undefined) {
      throw new BadRequestException(`missing weight for participant ${id}`);
    }
    return w;
  }
}
