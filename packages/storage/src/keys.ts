import { randomUUID } from 'node:crypto';

/**
 * Object keys are namespaced per user so blobs are isolated and easy to sweep.
 * When a content hash is given the key is content-addressed — the same file
 * always maps to the same key (re-upload is a harmless overwrite, enabling
 * dedup). Keys stay per-user so identical content across users never collides
 * (no cross-user dedup signal). Falls back to a random uuid when no hash.
 *   receiptKey(userId, 'jpg')          -> "receipts/<userId>/<uuid>.jpg"
 *   receiptKey(userId, 'jpg', <sha256>) -> "receipts/<userId>/<sha256>.jpg"
 */
export function receiptKey(userId: string, ext = 'jpg', sha256?: string): string {
  const name = sha256 ?? randomUUID();
  return `receipts/${userId}/${name}.${ext.replace(/^\./, '')}`;
}
