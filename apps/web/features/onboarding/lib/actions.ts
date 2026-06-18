'use server';

import { revalidatePath } from 'next/cache';
import { CompleteOnboardingInput } from '@spendlio/contracts';
import { completeOnboarding } from '@/lib/resources';
import { ApiError } from '@/lib/api';

export interface OnboardingResult {
  ok: boolean;
  error?: string;
}

// Persist the base currency + language and mark the user onboarded. Called once
// from the onboarding interstitial (ADR-038); the layout gate keys off the
// resulting onboardedAt, so we revalidate it after a successful save.
export async function completeOnboardingAction(input: {
  defaultCurrency: string;
  locale: string;
}): Promise<OnboardingResult> {
  const parsed = CompleteOnboardingInput.safeParse({
    defaultCurrency: input.defaultCurrency.toUpperCase(),
    locale: input.locale,
  });
  if (!parsed.success) return { ok: false, error: 'Pick a currency and language.' };

  try {
    await completeOnboarding(parsed.data);
  } catch (err) {
    if (err instanceof ApiError) return { ok: false, error: err.message };
    return { ok: false, error: 'Could not finish setting up your account.' };
  }

  revalidatePath('/', 'layout'); // the gate lives in the root layout
  return { ok: true };
}
