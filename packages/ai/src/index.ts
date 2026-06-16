import { hasLiveProvider } from './config';
import { OfflineProvider } from './offline';
import { LazyLiveProvider } from './live/lazy';
import type { ChatArgs, ChatResult, ChatStream, LLMProvider } from './provider';

// Public surface
export * from './provider';
export { categorizeByRules } from './rules';
export { OfflineProvider } from './offline';
export { createDbTools } from './tools/db-tools';
export { AssistantChatRequest } from './chat-contract';

/**
 * Provider factory. A live AI-SDK provider activates when a key is configured —
 * Anthropic (ANTHROPIC_API_KEY) or OpenAI (AI_PROVIDER=openai + OPENAI_API_KEY);
 * otherwise the deterministic offline engine is the default. This is the one
 * place the rest of the app gets a provider from.
 *
 * The live provider is loaded through `LazyLiveProvider` (an untyped runtime
 * `import()` boundary) so consumers don't drag the Vercel AI SDK's generic type
 * surface into their `tsc` runs — see `./live/lazy`.
 */
export function getProvider(): LLMProvider {
  return hasLiveProvider() ? new LazyLiveProvider() : new OfflineProvider();
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
