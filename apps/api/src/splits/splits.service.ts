import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { and, desc, eq, inArray, isNull } from 'drizzle-orm';
import { people, settlements, splits, splitShares } from '@spendlio/db';
import { computeSplit, netForUser, type Edge, type Share } from '@spendlio/core';
import type { Balance, CreateSplitInput } from '@spendlio/contracts';
import { DB } from '../db/db.module';

@Injectable()
export class SplitsService {
  constructor(@Inject(DB) private db: any) {}

  async list(userId: string) {
    const items = await this.db.select().from(splits)
      .where(and(eq(splits.userId, userId), isNull(splits.deletedAt)))
      .orderBy(desc(splits.createdAt));
    return { items, nextCursor: null };
  }

  /**
   * Create a split: core computes the per-person shares (deterministic leftover
   * cents), then split + split_shares are written together.
   */
  async create(userId: string, dto: CreateSplitInput) {
    // Build the detail core needs from the weights map, per mode.
    let detail: { exact?: Share[]; percents?: { personId: string; pct: number }[] } | undefined;
    if (dto.mode === 'exact') {
      detail = {
        exact: dto.participantIds.map((id) => ({ personId: id, amount: this.weight(dto, id) })),
      };
    } else if (dto.mode === 'percent') {
      detail = {
        percents: dto.participantIds.map((id) => ({ personId: id, pct: this.weight(dto, id) })),
      };
    }

    let shares: Share[];
    try {
      shares = computeSplit(dto.mode, dto.total, dto.participantIds, dto.payerId, detail);
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
      payerId: dto.payerId,
    }).returning();

    const sharesRows = await this.db.insert(splitShares).values(
      shares.map((s) => ({ splitId: split.id, personId: s.personId, amount: s.amount })),
    ).returning();

    return { ...split, shares: sharesRows };
  }

  async get(userId: string, id: string) {
    const [split] = await this.db.select().from(splits)
      .where(and(eq(splits.id, id), eq(splits.userId, userId), isNull(splits.deletedAt)));
    if (!split) throw new NotFoundException();
    const shares = await this.db.select().from(splitShares).where(eq(splitShares.splitId, id));
    return { ...split, shares };
  }

  async remove(userId: string, id: string) {
    await this.get(userId, id);
    await this.db.update(splits).set({ deletedAt: new Date() })
      .where(and(eq(splits.id, id), eq(splits.userId, userId)));
    return { ok: true };
  }

  /**
   * Net who-owes-whom per person, from the user's viewpoint (+ they owe you).
   * Same edge model as @spendlio/ai's balancesSummary: the payer is the
   * creditor, each other share-holder a debtor; a settled settlement is the
   * reverse edge. Netted via core.netForUser.
   */
  async balances(userId: string): Promise<Balance[]> {
    const userSplits = await this.db
      .select({ id: splits.id, payerId: splits.payerId, currency: splits.currency })
      .from(splits)
      .where(and(eq(splits.userId, userId), isNull(splits.deletedAt)));

    const splitIds = userSplits.map((s: { id: string }) => s.id);
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

    const payerOf = new Map<string, string>(userSplits.map((s: { id: string; payerId: string }) => [s.id, s.payerId]));
    const currencyOf = new Map<string, string>(userSplits.map((s: { id: string; currency: string }) => [s.id, s.currency]));
    const personCurrency = new Map<string, string>();
    const edges: Edge[] = [];

    for (const sh of shareRows as { splitId: string; personId: string; amount: number }[]) {
      const payerId = payerOf.get(sh.splitId);
      if (!payerId || sh.personId === payerId) continue; // payer doesn't owe themselves
      edges.push({ debtorId: sh.personId, creditorId: payerId, amount: Number(sh.amount) });
      const cur = currencyOf.get(sh.splitId);
      if (cur) personCurrency.set(sh.personId, cur);
    }
    for (const st of settled as { fromPersonId: string; toPersonId: string; amount: number; currency: string }[]) {
      edges.push({ debtorId: st.toPersonId, creditorId: st.fromPersonId, amount: Number(st.amount) });
      personCurrency.set(st.fromPersonId, st.currency);
      personCurrency.set(st.toPersonId, st.currency);
    }

    // Convention B: user is the implicit viewpoint and pays their own splits, so
    // each split's payer represents "me". Net per person, drop the payers (the
    // user), and drop zeros — what's left is each counterparty's balance.
    const net = new Map<string, number>();
    const bump = (id: string, d: number) => net.set(id, (net.get(id) ?? 0) + d);
    for (const e of edges) { bump(e.debtorId, e.amount); bump(e.creditorId, -e.amount); }
    for (const payerId of new Set(userSplits.map((s: { payerId: string }) => s.payerId))) net.delete(payerId as string);
    for (const [id, v] of net) if (v === 0) net.delete(id);

    const personIds = [...net.keys()];
    if (personIds.length === 0) return [];
    const persons = await this.db
      .select({ id: people.id })
      .from(people)
      .where(and(eq(people.userId, userId), inArray(people.id, personIds)));
    const known = new Set(persons.map((p: { id: string }) => p.id));

    const out: Balance[] = [];
    for (const id of personIds) {
      if (!known.has(id)) continue; // not one of this user's people
      out.push({ personId: id, currency: personCurrency.get(id) ?? 'USD', amount: net.get(id)! });
    }
    return out;
  }

  private weight(dto: CreateSplitInput, id: string): number {
    const w = dto.weights?.[id];
    if (w === undefined) {
      throw new BadRequestException(`missing weight for participant ${id}`);
    }
    return w;
  }
}
