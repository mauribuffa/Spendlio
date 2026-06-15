import { z } from 'zod';
import { ownedEntity } from './common';
import { CurrencyCode } from './money';
import { CategoryKey } from './enums';

export const BudgetPeriod = z.enum(['weekly', 'monthly', 'yearly']);
export type BudgetPeriod = z.infer<typeof BudgetPeriod>;

export const BudgetSchema = z.object({
  ...ownedEntity,
  category: CategoryKey,
  limit: z.number().int(), // minor units
  currency: CurrencyCode,
  period: BudgetPeriod.default('monthly'),
});
export type Budget = z.infer<typeof BudgetSchema>;

export const CreateBudgetInput = BudgetSchema.omit({
  id: true, userId: true, createdAt: true, updatedAt: true,
});
export type CreateBudgetInput = z.infer<typeof CreateBudgetInput>;

export const UpdateBudgetInput = CreateBudgetInput.partial();
export type UpdateBudgetInput = z.infer<typeof UpdateBudgetInput>;

// Computed (not stored) — returned by GET /budgets/status, derived in core.
export const BudgetStatus = z.object({
  category: CategoryKey,
  period: BudgetPeriod,
  currency: CurrencyCode,
  limit: z.number().int(),     // minor units
  spent: z.number().int(),     // minor units
  remaining: z.number().int(), // limit - spent (may be negative = over budget)
  pct: z.number(),             // spent / limit (0..1+); 0 when limit is 0
});
export type BudgetStatus = z.infer<typeof BudgetStatus>;
