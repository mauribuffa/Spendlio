import { z } from 'zod';
import { ownedEntity } from './common';
import { CurrencyCode } from './money';
import { ReceiptStatus } from './enums';

// Lowercase hex SHA-256 (64 chars) — the client-computed content hash.
export const Sha256Hex = z.string().regex(/^[0-9a-f]{64}$/, 'expected a 64-char hex SHA-256');
export type Sha256Hex = z.infer<typeof Sha256Hex>;

export const ReceiptLineItem = z.object({
  description: z.string(),
  quantity: z.number().int().default(1),
  amount: z.number().int(), // minor units
});
export type ReceiptLineItem = z.infer<typeof ReceiptLineItem>;

export const ReceiptSchema = z.object({
  ...ownedEntity,
  imageKey: z.string().min(1),                       // object-storage key (S3/MinIO)
  sha256: Sha256Hex.nullable().optional(),           // client content hash (null on legacy rows)
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

// Client creates a receipt by registering an uploaded image key (+ the content
// hash it computed before upload); OCR fills the rest. sha256 is optional so the
// flow degrades gracefully, but the web client always sends it.
export const CreateReceiptInput = z.object({
  imageKey: z.string().min(1),
  sha256: Sha256Hex.optional(),
});
export type CreateReceiptInput = z.infer<typeof CreateReceiptInput>;
