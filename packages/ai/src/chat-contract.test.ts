import { describe, it, expect } from 'vitest';
import { AssistantChatRequest } from './chat-contract';

describe('AssistantChatRequest input caps', () => {
  const msg = (content: string) => ({ role: 'user' as const, content });

  it('accepts a normal request', () => {
    expect(AssistantChatRequest.safeParse({ messages: [msg('hi')] }).success).toBe(true);
  });

  it('rejects an empty messages array', () => {
    expect(AssistantChatRequest.safeParse({ messages: [] }).success).toBe(false);
  });

  it('rejects content longer than 4000 chars', () => {
    expect(AssistantChatRequest.safeParse({ messages: [msg('x'.repeat(4001))] }).success).toBe(false);
  });

  it('rejects more than 50 messages', () => {
    const messages = Array.from({ length: 51 }, () => msg('hi'));
    expect(AssistantChatRequest.safeParse({ messages }).success).toBe(false);
  });
});
