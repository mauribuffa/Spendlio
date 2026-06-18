import { z } from 'zod';

export const QUEUES = {
  ocr: 'ocr',
  categorize: 'categorize',
  recurring: 'recurring',
  recap: 'recap',
  notify: 'notify',
} as const;
export type QueueName = typeof QUEUES[keyof typeof QUEUES];

export const OcrJob = z.object({ receiptId: z.string().uuid() });
export type OcrJob = z.infer<typeof OcrJob>;

export const CategorizeJob = z.object({ transactionId: z.string().uuid() });
export type CategorizeJob = z.infer<typeof CategorizeJob>;

// month is YYYY-MM — validated so a malformed value can't make monthBounds()
// produce NaN bounds and overwrite a good recap with zeros.
export const RecapJob = z.object({ userId: z.string().uuid(), month: z.string().regex(/^\d{4}-\d{2}$/) });
export type RecapJob = z.infer<typeof RecapJob>;

export const RecurringJob = z.object({ ruleId: z.string().uuid().optional() }); // omit ⇒ daily sweep of all due rules
export type RecurringJob = z.infer<typeof RecurringJob>;

// `dedupeKey` discriminates otherwise-identical notifications (e.g. one settle
// reminder per person per day) so the worker's insert can dedupe via a partial
// unique index. `type` is a closed set (fits the varchar(32) column) — an
// unconstrained string would let a typo enqueue and dedupe on the wrong key.
export const NotificationType = z.enum(['budget_alert', 'recap_ready', 'settle_reminder']);
export type NotificationType = z.infer<typeof NotificationType>;

export const NotifyJob = z.object({
  userId: z.string().uuid(),
  type: NotificationType,
  dedupeKey: z.string().min(1).optional(),
});
export type NotifyJob = z.infer<typeof NotifyJob>;
