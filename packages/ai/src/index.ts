import { hasLiveProvider } from './config';
import { OfflineProvider } from './offline';
import { LiveProvider } from './live';
import type { AssistantTools, ChatArgs, ChatMessage, ChatResult, ChatStream, LLMProvider } from './provider';

// Public surface
export * from './provider';
export { categorizeByRules } from './rules';
export { OfflineProvider } from './offline';
export { LiveProvider } from './live';
export { CLAUDE_MODEL, OPENAI_MODEL, hasAnthropicKey, wantsOpenAI, hasLiveProvider } from './config';

/**
 * Provider factory. A live AI-SDK provider activates when a key is configured —
 * Anthropic (ANTHROPIC_API_KEY) or OpenAI (AI_PROVIDER=openai + OPENAI_API_KEY);
 * otherwise the deterministic offline engine is the default. This is the one
 * place the rest of the app gets a provider from.
 */
export function getProvider(): LLMProvider {
  return hasLiveProvider() ? new LiveProvider() : new OfflineProvider();
}

/**
 * Run one assistant turn end-to-end (non-streamed): pick the provider, hand it
 * the typed tools, and return a grounded answer. `provider` is injectable for tests.
 */
export async function runAssistant(args: ChatArgs & { provider?: LLMProvider }): Promise<ChatResult> {
  const provider = args.provider ?? getProvider();
  return provider.chat({ messages: args.messages, tools: args.tools });
}

/**
 * Streaming counterpart of `runAssistant` — the chat HTTP endpoint calls this and
 * returns `.toUIMessageStreamResponse()` to the web app's `useChat` hook.
 */
export function streamAssistant(args: ChatArgs & { provider?: LLMProvider }): ChatStream {
  const provider = args.provider ?? getProvider();
  return provider.streamChat({ messages: args.messages, tools: args.tools });
}

export type { ChatMessage };
