import { z } from 'zod';
import { ownedEntity } from './common';
import { CurrencyCode } from './money';
import { CategoryKey } from './enums';

export const CategorySpend = z.object({
  category: CategoryKey,
  amount: z.number().int(), // minor units (in the summary currency)
});
export type CategorySpend = z.infer<typeof CategorySpend>;

// The monthly recap payload (built by the recap worker; stored per user+month).
export const MonthlySummarySchema = z.object({
  ...ownedEntity,
  month: z.string().regex(/^\d{4}-\d{2}$/), // YYYY-MM
  currency: CurrencyCode,                    // the user's default currency at build time
  totalIncome: z.number().int(),             // minor units
  totalExpense: z.number().int(),            // minor units
  net: z.number().int(),                     // income - expense
  byCategory: z.array(CategorySpend).default([]),
  topMerchant: z.string().nullable().optional(),
});
export type MonthlySummary = z.infer<typeof MonthlySummarySchema>;
