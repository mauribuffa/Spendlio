import { z } from 'zod';
import { ownedEntity } from './common';
import { CurrencyCode } from './money';
import { ReceiptStatus, ReceiptFailureReason, CategoryKey } from './enums';

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
  failureReason: ReceiptFailureReason.nullable().optional(), // why a 'failed' scan failed (friendly text mapped at the web edge)
  merchant: z.string().nullable().optional(),
  total: z.number().int().nullable().optional(),     // minor units, OCR-parsed
  currency: CurrencyCode.nullable().optional(),
  purchasedAt: z.coerce.date().nullable().optional(),
  lineItems: z.array(ReceiptLineItem).default([]),
  raw: z.unknown().optional(),                       // raw OCR payload (JSONB)
  category: CategoryKey.nullable().optional(),    // OCR-suggested spending category (from the ocr blob)
  transactionId: z.string().uuid().nullable().optional(),
  deletedAt: z.coerce.date().nullable().optional(),
});
export type Receipt = z.infer<typeof ReceiptSchema>;

// A short-lived presigned upload (the response of POST /receipts/presign). One
// source of truth shared by @spendlio/storage (the producer) and the web edge
// (the consumer), so a drift between them fails to typecheck rather than at
// runtime. The client PUTs the file body to `url` with the same contentType.
export const PresignedUploadSchema = z.object({
  url: z.string().url(),
  method: z.literal('PUT'),
  key: z.string().min(1),
  expiresIn: z.number().int().positive(),
});
export type PresignedUpload = z.infer<typeof PresignedUploadSchema>;

// Content types we allow a receipt upload to be presigned for. The value shapes
// the storage key's extension, so it must be validated (never attacker-shaped).
export const ReceiptContentType = z.enum([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
  'application/pdf',
]);
export type ReceiptContentType = z.infer<typeof ReceiptContentType>;

// Query params for POST /receipts/presign. Both optional (the flow degrades),
// but when present they are constrained so they can't poison the storage key.
export const PresignReceiptQuery = z.object({
  contentType: ReceiptContentType.optional(),
  sha256: Sha256Hex.optional(),
});
export type PresignReceiptQuery = z.infer<typeof PresignReceiptQuery>;

// Client creates a receipt by registering an uploaded image key (+ the content
// hash it computed before upload); OCR fills the rest. sha256 is optional so the
// flow degrades gracefully, but the web client always sends it.
export const CreateReceiptInput = z.object({
  imageKey: z.string().min(1),
  sha256: Sha256Hex.optional(),
});
export type CreateReceiptInput = z.infer<typeof CreateReceiptInput>;

// The user's reviewed/corrected values for a parsed receipt. Approving it
// updates the receipt AND creates the linked expense. Money is integer minor
// units (the web converts major→minor per-currency before sending).
export const ConfirmReceiptInput = z.object({
  merchant: z.string().min(1).nullable().optional(),
  occurredAt: z.coerce.date(),
  total: z.number().int(),            // minor units (magnitude; stored as a negative expense)
  currency: CurrencyCode,
  category: CategoryKey,
  lineItems: z.array(ReceiptLineItem).default([]),
});
export type ConfirmReceiptInput = z.infer<typeof ConfirmReceiptInput>;
