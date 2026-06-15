/**
 * SHA-256 of a file's bytes, as lowercase hex — computed in the browser via Web
 * Crypto (no bytes leave the client until the direct-to-storage upload). Used to
 * content-address the receipt upload key and to dedup/verify it server-side.
 * Web Crypto requires a secure context; localhost and https both qualify.
 */
export async function sha256Hex(file: File): Promise<string> {
  const buf = await file.arrayBuffer();
  const digest = await crypto.subtle.digest('SHA-256', buf);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}
