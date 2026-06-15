export type { BlobStore, PresignedUpload, PutObjectInput } from './blob-store';
export { S3BlobStore } from './s3-blob-store';
export { loadStorageConfig, type StorageConfig } from './config';
export { receiptKey } from './keys';

import type { BlobStore } from './blob-store';
import { S3BlobStore } from './s3-blob-store';

/**
 * The one place the app gets a BlobStore. Today it's S3-compatible (MinIO/R2/S3);
 * swapping vendors is a change here, not in every caller.
 */
export function getBlobStore(): BlobStore {
  return new S3BlobStore();
}
