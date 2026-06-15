import { z } from 'zod';
import { ownedEntity } from './common';
import { CurrencyCode, FxSnapshot } from './money';
import { CategoryKey, TransactionSource, TransactionStatus } from './enums';

export const TransactionSchema = z.object({
  ...ownedEntity,
  title: z.string().min(1),
  merchant: z.string().nullable().optional(),
  amount: z.number().int(),                 // minor units in ORIGINAL currency
  currency: CurrencyCode,
  fx: FxSnapshot.nullable().optional(),     // snapshot conversion to base currency; server-set
  category: CategoryKey,
  accountId: z.string().uuid().nullable().optional(),
  occurredAt: z.coerce.date(),
  note: z.string().nullable().optional(),
  status: TransactionStatus,
  source: TransactionSource.default('manual'),
  receiptId: z.string().uuid().nullable().optional(),
  splitId: z.string().uuid().nullable().optional(),
  recurringId: z.string().uuid().nullable().optional(),
  deletedAt: z.coerce.date().nullable().optional(),
});
export type Transaction = z.infer<typeof TransactionSchema>;

export const CreateTransactionInput = TransactionSchema
  .omit({ id: true, userId: true, createdAt: true, updatedAt: true, deletedAt: true, fx: true })
  .extend({ category: CategoryKey.optional(), status: TransactionStatus.optional() });
export type CreateTransactionInput = z.infer<typeof CreateTransactionInput>;

export const UpdateTransactionInput = CreateTransactionInput.partial();
export type UpdateTransactionInput = z.infer<typeof UpdateTransactionInput>;
