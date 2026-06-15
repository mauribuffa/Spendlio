import { anthropic } from '@ai-sdk/anthropic';
import { openai } from '@ai-sdk/openai';
import type { LanguageModel } from 'ai';
import { hasAnthropicKey, wantsOpenAI } from '../config';

/** Default Claude model. Env-overridable so prod can pin a different version. */
export const CLAUDE_MODEL = process.env.ANTHROPIC_MODEL ?? 'claude-opus-4-8';
/** Default OpenAI model. Env-overridable. */
export const OPENAI_MODEL = process.env.OPENAI_MODEL ?? 'gpt-4o';

/**
 * Resolve the AI-SDK model the live provider should use, from env:
 * Anthropic key -> Claude; else OpenAI (when AI_PROVIDER=openai + key) -> GPT.
 * Anthropic wins if both are configured. Constructing a model is lazy — the key
 * is only read when a request is actually made.
 *
 * This module imports the Vercel AI SDK, so it is reached ONLY through the live
 * provider (itself behind the `./live/lazy` runtime boundary), never the barrel.
 */
export function resolveLiveModel(): LanguageModel {
  if (wantsOpenAI() && !hasAnthropicKey()) return openai(OPENAI_MODEL);
  return anthropic(CLAUDE_MODEL);
}
