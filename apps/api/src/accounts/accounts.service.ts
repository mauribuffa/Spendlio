import { Inject, Injectable } from '@nestjs/common';
import { and, desc, eq, isNull } from 'drizzle-orm';
import { accounts, transactions, users, fxRates } from '@spendlio/db';
import type { DB as Database } from '@spendlio/db';
import { sumNet, convertMinor, type RateRow } from '@spendlio/core';
import type { CreateAccountInput, UpdateAccountInput, AccountBalance, AccountType } from '@spendlio/contracts';
import { DB } from '../db/db.module';
import { or404 } from '../common/or404';

@Injectable()
export class AccountsService {
  constructor(@Inject(DB) private db: Database) {}

  async list(userId: string) {
    const items = await this.db.select().from(accounts)
      .where(eq(accounts.userId, userId))
      .orderBy(desc(accounts.createdAt));
    return { items, nextCursor: null };
  }

  /**
   * Per-account balance rollup for the Accounts page. For each of the user's
   * accounts: net its non-deleted transactions (in the account's own currency)
   * and convert that to the user's base/default currency via the latest
   * fx_rates. Strictly scoped to userId; fx_rates is global. Converted value is
   * null when no rate connects the pair (the UI renders "—").
   */
  async balances(userId: string): Promise<AccountBalance[]> {
    const [user] = await this.db.select().from(users).where(eq(users.id, userId));
    const baseCurrency: string = user?.defaultCurrency ?? 'USD';

    const accountRows = await this.db.select().from(accounts)
      .where(eq(accounts.userId, userId))
      .orderBy(desc(accounts.createdAt));

    // Non-deleted transactions for THIS user, with their account + currency + amount.
    const txnRows = await this.db
      .select({
        accountId: transactions.accountId,
        amount: transactions.amount,
        currency: transactions.currency,
      })
      .from(transactions)
      .where(and(eq(transactions.userId, userId), isNull(transactions.deletedAt)));

    // Global fx_rates (no user scope). Loaded once and handed to core for picking.
    const rateRows: RateRow[] = await this.db
      .select({ base: fxRates.base, quote: fxRates.quote, date: fxRates.date, rate: fxRates.rate })
      .from(fxRates);

    // Net per account, in the account's own currency.
    const netByAccount = new Map<string, number[]>();
    for (const t of txnRows) {
      if (!t.accountId) continue;
      const arr = netByAccount.get(t.accountId) ?? [];
      arr.push(t.amount);
      netByAccount.set(t.accountId, arr);
    }

    return accountRows.map((a): AccountBalance => {
      const balance = sumNet(netByAccount.get(a.id) ?? []);
      const converted = convertMinor(balance, a.currency, baseCurrency, rateRows);
      return {
        accountId: a.id,
        name: a.name,
        type: a.type as AccountType,
        last4: a.last4 ?? null,
        currency: a.currency,
        balance,
        baseCurrency,
        baseBalance: converted.amount,
        rateAsOf: converted.rateAsOf,
      };
    });
  }

  async create(userId: string, dto: CreateAccountInput) {
    const [row] = await this.db.insert(accounts).values({ ...dto, userId }).returning();
    return row;
  }

  async get(userId: string, id: string) {
    const [row] = await this.db.select().from(accounts)
      .where(and(eq(accounts.id, id), eq(accounts.userId, userId)));
    return or404(row);
  }

  async update(userId: string, id: string, dto: UpdateAccountInput) {
    await this.get(userId, id);
    const [row] = await this.db.update(accounts)
      .set({ ...dto, updatedAt: new Date() })
      .where(and(eq(accounts.id, id), eq(accounts.userId, userId)))
      .returning();
    return row;
  }

  async remove(userId: string, id: string) {
    await this.get(userId, id);
    await this.db.update(accounts).set({ archivedAt: new Date(), updatedAt: new Date() })
      .where(and(eq(accounts.id, id), eq(accounts.userId, userId)));
    return { ok: true };
  }
}
