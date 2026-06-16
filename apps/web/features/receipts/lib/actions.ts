'use server';

import { revalidatePath } from 'next/cache';
import { CreateReceiptInput, ConfirmReceiptInput, toMinorUnits } from '@spendlio/contracts';
import { presignReceipt, registerReceipt, confirmReceipt, type PresignedUpload } from '@/lib/resources';
import { ApiError } from '@/lib/api';

export interface PresignResult {
  ok: boolean;
  error?: string;
  presigned?: PresignedUpload;
}

export interface RegisterResult {
  ok: boolean;
  error?: string;
  /** The new (or deduped) receipt id, so the client can open its review screen. */
  id?: string;
}

export interface ConfirmResult {
  ok: boolean;
  error?: string;
  fieldErrors?: Record<string, string[]>;
}

/** The reviewed values the user approves; amounts are human MAJOR units. */
export interface ConfirmPayload {
  merchant: string | null;
  occurredAt: string;          // YYYY-MM-DD (or ISO)
  currency: string;
  category: string;
  totalMajor: number;
  lineItems: { description: string; quantity: number; amountMajor: number }[];
}

/** Step 1: ask the API for a presigned PUT url for the given MIME type + hash. */
export async function presignAction(contentType: string, sha256?: string): Promise<PresignResult> {
  try {
    const presigned = await presignReceipt(contentType, sha256);
    return { ok: true, presigned };
  } catch (err) {
    if (err instanceof ApiError) return { ok: false, error: err.message };
    return { ok: false, error: 'Could not start the upload.' };
  }
}

/** Step 3: register the uploaded object key + content hash → row + OCR (deduped). */
export async function registerReceiptAction(imageKey: string, sha256?: string): Promise<RegisterResult> {
  const input = CreateReceiptInput.safeParse({ imageKey, sha256 });
  if (!input.success) {
    return { ok: false, error: 'Invalid upload key.' };
  }
  try {
    const receipt = await registerReceipt(input.data);
    revalidatePath('/receipts');
    return { ok: true, id: receipt.id };
  } catch (err) {
    if (err instanceof ApiError) return { ok: false, error: err.message };
    return { ok: false, error: 'Could not save the receipt.' };
  }
}

/**
 * Approve a reviewed receipt → create the linked expense. The user's MAJOR-unit
 * amounts are converted to integer minor units per-currency here (the ARS fix:
 * scale by the currency's real decimals, not a hardcoded ×100).
 */
export async function confirmReceiptAction(id: string, payload: ConfirmPayload): Promise<ConfirmResult> {
  const currency = payload.currency.toUpperCase();
  const input = ConfirmReceiptInput.safeParse({
    merchant: payload.merchant?.trim() || null,
    occurredAt: payload.occurredAt,
    total: toMinorUnits(payload.totalMajor, currency),
    currency,
    category: payload.category,
    lineItems: payload.lineItems.map((li) => ({
      description: li.description,
      quantity: li.quantity,
      amount: toMinorUnits(li.amountMajor, currency),
    })),
  });
  if (!input.success) {
    return { ok: false, fieldErrors: input.error.flatten().fieldErrors as Record<string, string[]> };
  }

  try {
    await confirmReceipt(id, input.data);
  } catch (err) {
    if (err instanceof ApiError) return { ok: false, error: err.message };
    return { ok: false, error: 'Could not save the expense.' };
  }

  revalidatePath(`/receipts/${id}`);
  revalidatePath('/receipts');
  revalidatePath('/transactions');
  revalidatePath('/');
  return { ok: true };
}
