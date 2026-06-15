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
