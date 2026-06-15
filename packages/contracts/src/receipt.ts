import { z } from 'zod';
import { ownedEntity } from './common';
import { CurrencyCode } from './money';
import { ReceiptStatus } from './enums';

export const ReceiptLineItem = z.object({
  description: z.string(),
  quantity: z.number().int().default(1),
  amount: z.number().int(), // minor units
});
export type ReceiptLineItem = z.infer<typeof ReceiptLineItem>;

export const ReceiptSchema = z.object({
  ...ownedEntity,
  imageKey: z.string().min(1),                       // object-storage key (S3/MinIO)
  status: ReceiptStatus,
  merchant: z.string().nullable().optional(),
  total: z.number().int().nullable().optional(),     // minor units, OCR-parsed
  currency: CurrencyCode.nullable().optional(),
  purchasedAt: z.coerce.date().nullable().optional(),
  lineItems: z.array(ReceiptLineItem).default([]),
  raw: z.unknown().optional(),                       // raw OCR payload (JSONB)
  transactionId: z.string().uuid().nullable().optional(),
  deletedAt: z.coerce.date().nullable().optional(),
});
export type Receipt = z.infer<typeof ReceiptSchema>;

// Client creates a receipt by registering an uploaded image key; OCR fills the rest.
export const CreateReceiptInput = z.object({ imageKey: z.string().min(1) });
export type CreateReceiptInput = z.infer<typeof CreateReceiptInput>;
