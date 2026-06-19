import type { OcrJob, CategorizeJob, RecapJob, RecurringJob, NotifyJob, FxRefreshJob } from '@spendlio/contracts';

/**
 * The payload type for each queue, keyed by the QUEUES registry name from
 * contracts. Job name + payload schema are the contract shared by producer
 * (apps/api) and consumer (apps/worker); the work itself lives in core.
 */
export interface JobPayloadMap {
  ocr: OcrJob;
  categorize: CategorizeJob;
  recurring: RecurringJob;
  recap: RecapJob;
  notify: NotifyJob;
  fx: FxRefreshJob;
}

// Re-exported so consumers (worker processors) get the payload types from the
// queue package they already depend on.
export type { OcrJob, CategorizeJob, RecapJob, RecurringJob, NotifyJob, FxRefreshJob };
