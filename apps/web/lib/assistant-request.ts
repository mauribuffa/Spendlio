/**
 * Normalize the chat body the browser's `useChat` hook POSTs into the API's
 * `AssistantChatRequest` shape.
 *
 * The AI SDK (v6) `DefaultChatTransport` sends messages in UIMessage form —
 * `{ role, parts: [{ type: 'text', text }] }` — but the API contract expects
 * `{ role, content: string }`. Forwarding the raw body 400s ("messages: Required",
 * because each message lacks `content`). We flatten `parts` → `content` here, at
 * the web edge, so the API contract stays clean and provider-agnostic.
 *
 * Pure + dependency-free so it can be unit-tested and reasoned about in isolation.
 */
type IncomingPart = { type?: string; text?: string };
type IncomingMessage = { role?: string; content?: unknown; parts?: IncomingPart[] };
export type ApiChatMessage = { role: 'user' | 'assistant'; content: string };

export function normalizeAssistantBody(raw: unknown): { messages: ApiChatMessage[] } {
  const list: IncomingMessage[] =
    raw && typeof raw === 'object' && Array.isArray((raw as { messages?: unknown }).messages)
      ? ((raw as { messages: IncomingMessage[] }).messages)
      : [];

  const messages = list
    .filter((m) => m?.role === 'user' || m?.role === 'assistant')
    .map((m) => ({
      role: m.role as 'user' | 'assistant',
      content:
        typeof m.content === 'string'
          ? m.content
          : Array.isArray(m.parts)
            ? m.parts
                .filter((p) => p?.type === 'text' && typeof p.text === 'string')
                .map((p) => p.text as string)
                .join('')
            : '',
    }))
    .filter((m) => m.content.length > 0);

  return { messages };
}
