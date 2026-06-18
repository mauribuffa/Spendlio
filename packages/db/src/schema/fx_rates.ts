import { pgTable, uuid, varchar, timestamp, unique } from 'drizzle-orm/pg-core';

// Daily FX rates pulled from a feed (ADR-016). Global (not user-owned).
// `rate` is stored as an exact decimal STRING to avoid float drift — all FX
// math runs in integer minor units in core, applying this rate with a
// documented rounding rule. (docs/learning/12-currency-and-fx.md)
export const fxRates = pgTable('fx_rates', {
  id: uuid('id').primaryKey().defaultRandom(),
  base: varchar('base', { length: 3 }).notNull(),    // e.g. 'USD'
  quote: varchar('quote', { length: 3 }).notNull(),  // e.g. 'ARS'
  date: varchar('date', { length: 10 }).notNull(),   // YYYY-MM-DD (the rate's day)
  rate: varchar('rate', { length: 32 }).notNull(),   // exact decimal string: base -> quote
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => ({
  // The unique index on (base, quote, date) already serves the pair+date lookup;
  // a separate same-columns index would be redundant.
  uniqRate: unique('fx_rates_base_quote_date_uniq').on(t.base, t.quote, t.date),
}));
