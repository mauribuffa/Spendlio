import type { ReceiptFailureReason } from '@spendlio/contracts';

/** The user-facing line for a failed scan. `unknown`/null/undefined → the generic fallback. */
export function failureReasonText(reason: ReceiptFailureReason | null | undefined): string {
  switch (reason) {
    case 'timeout':
      return 'Reading this receipt took too long. Please try again.';
    case 'image_unavailable':
      return "We couldn't access this receipt's image. Please upload it again.";
    case 'unreadable':
      return "We couldn't read this receipt. Retry, or scan a clearer, well-lit photo.";
    default:
      return 'Something went wrong while reading this receipt. Please try again.';
  }
}
