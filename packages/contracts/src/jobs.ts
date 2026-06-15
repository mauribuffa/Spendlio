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

export const RecapJob = z.object({ userId: z.string().uuid(), month: z.string() }); // YYYY-MM
export type RecapJob = z.infer<typeof RecapJob>;

export const RecurringJob = z.object({ ruleId: z.string().uuid().optional() }); // omit ⇒ daily sweep of all due rules
export type RecurringJob = z.infer<typeof RecurringJob>;

export const NotifyJob = z.object({ userId: z.string().uuid(), type: z.string() }); // budget_alert | recap_ready | settle_reminder
export type NotifyJob = z.infer<typeof NotifyJob>;
