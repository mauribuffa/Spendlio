import { describe, it, expect, beforeAll } from 'vitest';
import { loadStorageConfig } from './config';
import { receiptKey } from './keys';
import { S3BlobStore } from './s3-blob-store';

describe('loadStorageConfig', () => {
  it('reads STORAGE_* env into config', () => {
    const cfg = loadStorageConfig({
      STORAGE_ENDPOINT: 'http://localhost:9000',
      STORAGE_REGION: 'us-east-1',
      STORAGE_BUCKET: 'receipts',
      STORAGE_KEY: 'spendlio',
      STORAGE_SECRET: 'spendlio123',
      STORAGE_FORCE_PATH_STYLE: 'true',
    } as NodeJS.ProcessEnv);
    expect(cfg).toEqual({
      endpoint: 'http://localhost:9000',
      region: 'us-east-1',
      bucket: 'receipts',
      accessKeyId: 'spendlio',
      secretAccessKey: 'spendlio123',
      forcePathStyle: true,
    });
  });

  it('tolerates an inline comment on the bool flag (matches our .env)', () => {
    const cfg = loadStorageConfig({
      STORAGE_FORCE_PATH_STYLE: 'true   # required for MinIO; false for AWS S3',
    } as NodeJS.ProcessEnv);
    expect(cfg.forcePathStyle).toBe(true);
  });

  it('defaults forcePathStyle to false when no endpoint is set (AWS S3)', () => {
    const cfg = loadStorageConfig({} as NodeJS.ProcessEnv);
    expect(cfg.endpoint).toBeUndefined();
    expect(cfg.forcePathStyle).toBe(false);
    expect(cfg.region).toBe('us-east-1');
  });

  it('defaults forcePathStyle to true when an endpoint is set but flag is absent (MinIO/R2)', () => {
    const cfg = loadStorageConfig({ STORAGE_ENDPOINT: 'http://localhost:9000' } as NodeJS.ProcessEnv);
    expect(cfg.forcePathStyle).toBe(true);
  });
});

describe('receiptKey', () => {
  it('namespaces by user and is unique per call', () => {
    const u = '00000000-0000-0000-0000-000000000001';
    const a = receiptKey(u, 'jpg');
    const b = receiptKey(u, 'jpg');
    expect(a).toMatch(new RegExp(`^receipts/${u}/[0-9a-f-]{36}\\.jpg$`));
    expect(a).not.toBe(b);
  });

  it('strips a leading dot from the extension', () => {
    expect(receiptKey('u', '.png')).toMatch(/\.png$/);
  });

  it('is content-addressed (stable) when given a sha256', () => {
    const u = '00000000-0000-0000-0000-000000000001';
    const h = 'a'.repeat(64);
    const a = receiptKey(u, 'jpg', h);
    const b = receiptKey(u, 'jpg', h);
    expect(a).toBe(`receipts/${u}/${h}.jpg`);
    expect(a).toBe(b); // same content -> same key (dedup)
  });
});

// Round-trip against a real MinIO (docker compose up; bucket `receipts` exists).
// Skips cleanly if MinIO is unreachable so the suite never hangs or fails offline.
describe('S3BlobStore round-trip (MinIO)', () => {
  // Mirror .env so the test works whether or not the runner exported it.
  const env: NodeJS.ProcessEnv = {
    STORAGE_ENDPOINT: process.env.STORAGE_ENDPOINT ?? 'http://localhost:9000',
    STORAGE_REGION: process.env.STORAGE_REGION ?? 'us-east-1',
    STORAGE_BUCKET: process.env.STORAGE_BUCKET ?? 'receipts',
    STORAGE_KEY: process.env.STORAGE_KEY ?? 'spendlio',
    STORAGE_SECRET: process.env.STORAGE_SECRET ?? 'spendlio123',
    STORAGE_FORCE_PATH_STYLE: process.env.STORAGE_FORCE_PATH_STYLE ?? 'true',
  };
  const store = new S3BlobStore(loadStorageConfig(env));
  let online = false;

  beforeAll(async () => {
    try {
      await store.exists(`__healthcheck/${Date.now()}`); // a HEAD that just needs to connect
      online = true;
    } catch {
      online = false;
    }
  });

  it('presign PUT → upload → get → exists → delete', async (ctx) => {
    if (!online) ctx.skip();
    const key = receiptKey('00000000-0000-0000-0000-000000000001', 'txt');
    const body = Buffer.from('round-trip-bytes');

    const presigned = await store.presignUpload({ key, contentType: 'text/plain' });
    expect(presigned.method).toBe('PUT');
    expect(presigned.key).toBe(key);
    expect(presigned.url).toMatch(/^http/);

    // Upload via the presigned URL exactly as a client would.
    const put = await fetch(presigned.url, {
      method: 'PUT',
      headers: { 'content-type': 'text/plain' },
      body,
    });
    expect(put.ok).toBe(true);

    const got = await store.getObject(key);
    expect(Buffer.from(got).toString('utf8')).toBe('round-trip-bytes');

    expect(await store.exists(key)).toBe(true);

    await store.deleteObject(key);
    expect(await store.exists(key)).toBe(false);
    await store.deleteObject(key); // idempotent
  });
});
