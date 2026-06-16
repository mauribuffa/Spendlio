import 'server-only';
import { SignJWT } from 'jose';
import { auth } from '@/auth';

function secret(): Uint8Array {
  return new TextEncoder().encode(process.env.API_JWT_SECRET ?? 'change-me-dev-only');
}

/**
 * Mint a short-lived API access token for the signed-in user (server-only).
 * Returns null when there is no session. The API verifies signature + iss/aud/exp.
 */
export async function getApiToken(): Promise<string | null> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return null;
  return new SignJWT({})
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(userId)
    .setIssuer('spendlio-web')
    .setAudience('spendlio-api')
    .setIssuedAt()
    .setExpirationTime('5m')
    .sign(secret());
}
