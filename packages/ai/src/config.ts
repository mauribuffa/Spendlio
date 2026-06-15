import { anthropic } from '@ai-sdk/anthropic';
import { openai } from '@ai-sdk/openai';
import type { LanguageModel } from 'ai';

/** Default Claude model. Env-overridable so prod can pin a different version. */
export const CLAUDE_MODEL = process.env.ANTHROPIC_MODEL ?? 'claude-opus-4-8';
/** Default OpenAI model. Env-overridable. */
export const OPENAI_MODEL = process.env.OPENAI_MODEL ?? 'gpt-4o';

/** True when a Claude API key is present. */
export const hasAnthropicKey = (): boolean => Boolean(process.env.ANTHROPIC_API_KEY);
/** True when OpenAI is both keyed and explicitly selected via AI_PROVIDER=openai. */
export const wantsOpenAI = (): boolean =>
  Boolean(process.env.OPENAI_API_KEY) && process.env.AI_PROVIDER === 'openai';

/** True when any live (non-offline) provider is configured. */
export const hasLiveProvider = (): boolean => hasAnthropicKey() || wantsOpenAI();

/**
 * Resolve the AI-SDK model the live provider should use, from env:
 * Anthropic key -> Claude; else OpenAI (when AI_PROVIDER=openai + key) -> GPT.
 * Anthropic wins if both are configured. Constructing a model is lazy — the key
 * is only read when a request is actually made.
 */
export function resolveLiveModel(): LanguageModel {
  if (wantsOpenAI() && !hasAnthropicKey()) return openai(OPENAI_MODEL);
  return anthropic(CLAUDE_MODEL);
}
