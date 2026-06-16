import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import type { BlobStore, PresignedUpload, PutObjectInput } from './blob-store';
import { loadStorageConfig, type StorageConfig } from './config';

const DEFAULT_EXPIRES = 900; // 15 minutes

/** S3-compatible BlobStore: MinIO locally, R2/S3 in prod (config-only swap). */
export class S3BlobStore implements BlobStore {
  private readonly client: S3Client;
  private readonly bucket: string;

  constructor(config: StorageConfig = loadStorageConfig()) {
    // Fail fast on missing credentials rather than building a client with empty
    // strings (which fails opaquely later, on the first presign/upload).
    if (!config.accessKeyId || !config.secretAccessKey) {
      throw new Error(
        'Storage is not configured: set STORAGE_KEY and STORAGE_SECRET (see .env / docker-compose MinIO).',
      );
    }
    this.bucket = config.bucket;
    this.client = new S3Client({
      region: config.region,
      endpoint: config.endpoint,
      forcePathStyle: config.forcePathStyle,
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      },
    });
  }

  async presignUpload(args: { key: string; contentType?: string; expiresIn?: number }): Promise<PresignedUpload> {
    const expiresIn = args.expiresIn ?? DEFAULT_EXPIRES;
    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: args.key,
      ContentType: args.contentType,
    });
    const url = await getSignedUrl(this.client, command, { expiresIn });
    return { url, method: 'PUT', key: args.key, expiresIn };
  }

  async presignDownload(args: { key: string; expiresIn?: number }): Promise<string> {
    const expiresIn = args.expiresIn ?? DEFAULT_EXPIRES;
    const command = new GetObjectCommand({ Bucket: this.bucket, Key: args.key });
    return getSignedUrl(this.client, command, { expiresIn });
  }

  async putObject(input: PutObjectInput): Promise<{ key: string }> {
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: input.key,
        Body: input.body,
        ContentType: input.contentType,
      }),
    );
    return { key: input.key };
  }

  async getObject(key: string): Promise<Uint8Array> {
    const res = await this.client.send(new GetObjectCommand({ Bucket: this.bucket, Key: key }));
    // Body is a stream in Node; the v3 SDK provides transformToByteArray().
    const body = res.Body as { transformToByteArray?: () => Promise<Uint8Array> } | undefined;
    if (!body?.transformToByteArray) throw new Error(`getObject: empty body for key ${key}`);
    return body.transformToByteArray();
  }

  async exists(key: string): Promise<boolean> {
    try {
      await this.client.send(new HeadObjectCommand({ Bucket: this.bucket, Key: key }));
      return true;
    } catch (err) {
      const e = err as { name?: string; $metadata?: { httpStatusCode?: number } };
      if (e.name === 'NotFound' || e.$metadata?.httpStatusCode === 404) return false;
      throw err;
    }
  }

  async deleteObject(key: string): Promise<void> {
    // S3 DeleteObject is already idempotent (deleting a missing key returns 204).
    await this.client.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: key }));
  }
}
