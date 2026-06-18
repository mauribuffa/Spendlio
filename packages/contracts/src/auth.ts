import { z } from 'zod';

/** Sign-in step 1: ask for a one-time code. */
export const OtpRequestInput = z.object({ email: z.string().email() });
export type OtpRequestInput = z.infer<typeof OtpRequestInput>;

/**
 * Response of step 1. `devCode` is echoed back ONLY when the API uses the dev
 * console transport (no real email delivered) AND NODE_ENV !== 'production', so
 * local dev + the live contract test can complete the flow without reading email.
 * Never present in production, and never when a real SMTP transport is active.
 */
export const OtpRequestResult = z.object({
  ok: z.literal(true),
  devCode: z.string().regex(/^\d{6}$/).optional(),
});
export type OtpRequestResult = z.infer<typeof OtpRequestResult>;

/** Sign-in step 2: submit the code. */
export const OtpVerifyInput = z.object({
  email: z.string().email(),
  code: z.string().regex(/^\d{6}$/),
});
export type OtpVerifyInput = z.infer<typeof OtpVerifyInput>;

/** The identity the API returns on a successful verify (after provisioning). */
export const AuthUser = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  name: z.string().min(1),
});
export type AuthUser = z.infer<typeof AuthUser>;
