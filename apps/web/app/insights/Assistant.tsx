'use client';

import { useState } from 'react';
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport, isTextUIPart, type UIMessage } from 'ai';
import { Card, Button, Input } from '@spendlio/ui';

/** Pull the plain text out of a UIMessage's parts. */
function textOf(message: UIMessage): string {
  return message.parts
    .filter(isTextUIPart)
    .map((p) => p.text)
    .join('');
}

const SUGGESTIONS = [
  'How much did I spend on dining last month?',
  'What is my biggest expense category?',
  'Am I over budget anywhere?',
];

/**
 * Chat over your data. useChat streams from the same-origin /api/assistant
 * route, which proxies to the API's POST /api/assistant (the grounded
 * assistant from @spendlio/ai), injecting the dev user header server-side. The
 * answer is grounded in the user's own transactions via server-side tools.
 */
export function Assistant() {
  const { messages, sendMessage, status, error } = useChat({
    transport: new DefaultChatTransport({ api: '/api/assistant' }),
  });
  const [input, setInput] = useState('');
  const busy = status === 'submitted' || status === 'streaming';

  function submit(text: string) {
    const trimmed = text.trim();
    if (!trimmed || busy) return;
    sendMessage({ text: trimmed });
    setInput('');
  }

  return (
    <Card padding="lg">
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 'var(--space-4)',
          minHeight: 320,
        }}
      >
        {messages.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
            <p style={{ color: 'var(--text-muted)' }}>
              Ask about your spending. The assistant answers from your own data.
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-2)' }}>
              {SUGGESTIONS.map((s) => (
                <Button key={s} variant="secondary" size="sm" onClick={() => submit(s)}>
                  {s}
                </Button>
              ))}
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
            {messages.map((m) => (
              <div
                key={m.id}
                style={{
                  alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start',
                  maxWidth: '80%',
                  padding: 'var(--space-3) var(--space-4)',
                  borderRadius: 'var(--radius-card)',
                  background: m.role === 'user' ? 'var(--action-primary)' : 'var(--neutral-100)',
                  color: m.role === 'user' ? 'var(--text-on-brand)' : 'var(--text-strong)',
                  fontSize: 'var(--text-sm)',
                  whiteSpace: 'pre-wrap',
                }}
              >
                {textOf(m)}
              </div>
            ))}
            {status === 'streaming' ? (
              <span style={{ color: 'var(--text-subtle)', fontSize: 'var(--text-sm)' }}>Thinking…</span>
            ) : null}
          </div>
        )}

        {error ? (
          <p style={{ color: 'var(--sand-600)', fontSize: 'var(--text-sm)', margin: 0 }}>
            The assistant is not reachable yet. It comes online once the API is running.
          </p>
        ) : null}

        <form
          onSubmit={(e) => {
            e.preventDefault();
            submit(input);
          }}
          style={{ display: 'flex', gap: 'var(--space-2)', marginTop: 'auto' }}
        >
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about your spending…"
            aria-label="Message the assistant"
          />
          <Button type="submit" disabled={busy || !input.trim()}>
            Send
          </Button>
        </form>
      </div>
    </Card>
  );
}
