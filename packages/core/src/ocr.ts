import type { ReceiptFailureReason } from '@spendlio/contracts';

// Heuristic classification of an OCR worker error into a user-facing reason
// code. The raw message is still persisted to `dead_letters` for the developer;
// this only decides which friendly line the user sees. Order matters: a timeout
// also matches the provider's "extraction failed" wrapper, so check it first.
const TIMEOUT = /timeout|timed out|abort/i;
const IMAGE = /hash mismatch|no such key|nosuchkey|not found|could not (?:get|read|download)|getobject/i;
const UNREADABLE = /extraction failed|unreadable|parse|invalid|schema|did not match/i;

export function classifyOcrFailure(message: string | null | undefined): ReceiptFailureReason {
  const m = message ?? '';
  if (TIMEOUT.test(m)) return 'timeout';
  if (IMAGE.test(m)) return 'image_unavailable';
  if (UNREADABLE.test(m)) return 'unreadable';
  return 'unknown';
}
