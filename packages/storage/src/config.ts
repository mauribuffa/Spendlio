/**
 * Storage config from STORAGE_* env (see .env / docker-compose MinIO).
 * MinIO locally, R2/S3 in prod — same S3 API, different endpoint + path-style flag.
 */
export interface StorageConfig {
  endpoint?: string;     // MinIO: http://localhost:9000 ; AWS S3: omit (use region default)
  region: string;
  bucket: string;
  accessKeyId: string;
  secretAccessKey: string;
  forcePathStyle: boolean; // true for MinIO; false for AWS S3
}

export function loadStorageConfig(env: NodeJS.ProcessEnv = process.env): StorageConfig {
  const endpoint = env.STORAGE_ENDPOINT?.trim() || undefined;
  return {
    endpoint,
    region: env.STORAGE_REGION?.trim() || 'us-east-1',
    bucket: env.STORAGE_BUCKET?.trim() || 'receipts',
    accessKeyId: env.STORAGE_KEY?.trim() || '',
    secretAccessKey: env.STORAGE_SECRET?.trim() || '',
    // Default true when an explicit endpoint is set (MinIO/R2), else false (AWS S3).
    forcePathStyle: parseBool(env.STORAGE_FORCE_PATH_STYLE, Boolean(endpoint)),
  };
}

function parseBool(v: string | undefined, fallback: boolean): boolean {
  if (v == null) return fallback;
  // tolerate inline comments / whitespace, e.g. "true   # required for MinIO"
  const token = v.trim().toLowerCase().split(/\s+/)[0];
  if (token === 'true' || token === '1') return true;
  if (token === 'false' || token === '0') return false;
  return fallback;
}
