import { randomUUID } from 'node:crypto';

/**
 * Object keys are namespaced so a user's blobs are isolated and easy to sweep.
 * e.g. receiptKey(userId, 'jpg') -> "receipts/<userId>/<uuid>.jpg"
 */
export function receiptKey(userId: string, ext = 'jpg'): string {
  return `receipts/${userId}/${randomUUID()}.${ext.replace(/^\./, '')}`;
}
