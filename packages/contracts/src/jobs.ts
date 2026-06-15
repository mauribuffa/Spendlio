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
