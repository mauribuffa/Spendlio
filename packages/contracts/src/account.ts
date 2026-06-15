import { z } from 'zod';
import { ownedEntity } from './common';
import { CurrencyCode } from './money';
import { AccountType } from './enums';

export const AccountSchema = z.object({
  ...ownedEntity,
  name: z.string().min(1),
  type: AccountType,
  currency: CurrencyCode,
  institution: z.string().nullable().optional(),
  last4: z.string().length(4).nullable().optional(),
  archivedAt: z.coerce.date().nullable().optional(),
});
export type Account = z.infer<typeof AccountSchema>;

export const CreateAccountInput = AccountSchema.omit({
  id: true, userId: true, createdAt: true, updatedAt: true, archivedAt: true,
});
export type CreateAccountInput = z.infer<typeof CreateAccountInput>;

export const UpdateAccountInput = CreateAccountInput.partial();
export type UpdateAccountInput = z.infer<typeof UpdateAccountInput>;

// Per-account balance rollup for the Accounts page. `balance` is the net of the
// account's non-deleted transactions in the account's OWN currency (minor units).
// `baseBalance` is that value converted to the user's base/default currency via
// the latest fx_rates — and is null (UI shows "—") when no rate connects the pair.
export const AccountBalanceSchema = z.object({
  accountId: z.string().uuid(),
  name: z.string().min(1),
  type: AccountType,
  last4: z.string().length(4).nullable(),
  currency: CurrencyCode,
  balance: z.number().int(),            // minor units in `currency`
  baseCurrency: CurrencyCode,
  baseBalance: z.number().int().nullable(),  // minor units in baseCurrency; null = rate unavailable
  rateAsOf: z.string().nullable(),      // YYYY-MM-DD of the rate used; null when native or unavailable
});
export type AccountBalance = z.infer<typeof AccountBalanceSchema>;
