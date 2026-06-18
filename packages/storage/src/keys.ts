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

/**
 * True iff `key` is a receipt object that legitimately belongs to `userId` — i.e.
 * a single object directly under `receipts/<userId>/`, with no nested path or
 * traversal. The client re-asserts its `imageKey` at register time; the server
 * MUST gate it with this before storing/serving the blob, or a caller could
 * register a row pointing at another user's object and read it back via the
 * presigned-download endpoint. When a `sha256` is declared the basename must
 * name that hash, so a stolen key can't be smuggled in under a different hash.
 */
export function isOwnReceiptKey(key: string, userId: string, sha256?: string): boolean {
  const prefix = `receipts/${userId}/`;
  if (!key.startsWith(prefix)) return false;
  const name = key.slice(prefix.length);
  if (name.length === 0 || name.includes('/') || name === '.' || name === '..') return false;
  if (sha256 && !name.startsWith(`${sha256}.`)) return false;
  return true;
}
