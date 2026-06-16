'use server';

import { API_BASE } from '@/lib/config';
import { OtpRequestInput, OtpRequestResult } from '@spendlio/contracts';

export interface RequestOtpResult {
  ok: boolean;
  error?: string;
  /** Dev-only echo of the code so you can complete the flow locally. */
  devCode?: string;
}

export async function requestOtpAction(email: string): Promise<RequestOtpResult> {
  const parsed = OtpRequestInput.safeParse({ email });
  if (!parsed.success) return { ok: false, error: 'Enter a valid email address.' };
  try {
    const res = await fetch(`${API_BASE}/auth/otp/request`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(parsed.data),
      cache: 'no-store',
    });
    if (!res.ok) return { ok: false, error: 'Could not send the code. Please try again.' };
    const body = OtpRequestResult.safeParse(await res.json());
    return { ok: true, devCode: body.success ? body.data.devCode : undefined };
  } catch {
    return { ok: false, error: 'Could not reach the server.' };
  }
}
