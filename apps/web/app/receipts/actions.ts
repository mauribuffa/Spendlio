'use server';

import { revalidatePath } from 'next/cache';
import { CreateReceiptInput } from '@spendlio/contracts';
import { presignReceipt, registerReceipt, type PresignedUpload } from '../../lib/resources';
import { ApiError } from '../../lib/api';

export interface PresignResult {
  ok: boolean;
  error?: string;
  presigned?: PresignedUpload;
}

export interface RegisterResult {
  ok: boolean;
  error?: string;
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
    await registerReceipt(input.data);
  } catch (err) {
    if (err instanceof ApiError) return { ok: false, error: err.message };
    return { ok: false, error: 'Could not save the receipt.' };
  }
  revalidatePath('/receipts');
  return { ok: true };
}
