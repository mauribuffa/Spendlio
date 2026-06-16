/**
 * The storage interface the rest of the app depends on — never a vendor SDK.
 * Local (MinIO) and prod (R2/S3) are the same interface behind a config swap.
 * (Golden rule 6: target interfaces, not vendors.)
 */
import type { PresignedUpload } from '@spendlio/contracts';

// The presigned-upload shape is owned by @spendlio/contracts (one source of
// truth shared with the web edge); re-exported here for storage's consumers.
export type { PresignedUpload };

export interface PutObjectInput {
  key: string;
  body: Uint8Array | Buffer;
  contentType?: string;
}

export interface BlobStore {
  /**
   * A short-lived URL the client PUTs a file to directly (the bytes never pass
   * through our API). Returns the URL + the final object key.
   */
  presignUpload(args: { key: string; contentType?: string; expiresIn?: number }): Promise<PresignedUpload>;

  /** A short-lived URL to GET (download) an existing object. */
  presignDownload(args: { key: string; expiresIn?: number }): Promise<string>;

  /** Server-side upload (workers writing OCR-derived artifacts, seeds, tests). */
  putObject(input: PutObjectInput): Promise<{ key: string }>;

  /** Read an object's bytes server-side (e.g. a worker fetching a receipt image). */
  getObject(key: string): Promise<Uint8Array>;

  /** True if an object exists at `key` (HEAD); false if missing. */
  exists(key: string): Promise<boolean>;

  /** Remove an object. Idempotent: deleting a missing key does not throw. */
  deleteObject(key: string): Promise<void>;
}
