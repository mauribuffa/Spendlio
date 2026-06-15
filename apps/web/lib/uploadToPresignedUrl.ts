/**
 * Upload a file's bytes directly to a presigned storage URL from the browser.
 *
 * This is the ONE network call the receipts flow makes client-side: the bytes
 * go straight to MinIO/S3 and never pass through our API. The URL is short-lived
 * and carries no Spendlio auth, so exposing it to the browser is safe. presign
 * (get the URL) and register (record the key) both stay on the server so the
 * `x-user-id` header is never shipped to the client.
 */
export async function uploadToPresignedUrl(url: string, file: File): Promise<void> {
  const res = await fetch(url, {
    method: 'PUT',
    body: file,
    headers: { 'content-type': file.type || 'application/octet-stream' },
  });
  if (!res.ok) {
    throw new Error(`Receipt upload failed (${res.status}). Try again.`);
  }
}
