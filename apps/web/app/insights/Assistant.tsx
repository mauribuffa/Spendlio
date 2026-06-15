'use client';

import { useState } from 'react';
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport, isTextUIPart, type UIMessage } from 'ai';
import { Sparkles, ArrowUp } from 'lucide-react';
import { Avatar } from '@spendlio/ui';

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

const GREETING =
  'Hi — ask me anything about your spending. For example, how much did I spend on dining this month?';

/** AI avatar — green disc with a sparkle, matching the canonical bundle. */
function AiBadge() {
  return (
    <span
      style={{
        width: 34,
        height: 34,
        borderRadius: 999,
        flex: 'none',
        background: 'var(--green-600)',
        color: '#fff',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Sparkles size={17} strokeWidth={2} aria-hidden="true" />
    </span>
  );
}

/** A single chat row. AI bubbles align left on the card surface; user bubbles align right on the brand action color. */
function Bubble({ role, children }: { role: 'ai' | 'me'; children: React.ReactNode }) {
  const ai = role === 'ai';
  return (
    <div
      style={{
        display: 'flex',
        gap: 12,
        justifyContent: ai ? 'flex-start' : 'flex-end',
        marginBottom: 14,
      }}
    >
      {ai ? <AiBadge /> : null}
      <div
        style={{
          maxWidth: 560,
          padding: '13px 16px',
          borderRadius: 16,
          borderTopLeftRadius: ai ? 4 : 16,
          borderTopRightRadius: ai ? 16 : 4,
          background: ai ? 'var(--surface-card)' : 'var(--action-primary)',
          color: ai ? 'var(--text-body)' : '#fff',
          fontSize: 14.5,
          lineHeight: 1.5,
          border: ai ? '1px solid var(--border-subtle)' : 'none',
          boxShadow: ai ? 'var(--shadow-xs)' : 'none',
          whiteSpace: 'pre-wrap',
        }}
      >
        {children}
      </div>
      {!ai ? <Avatar name="Alex Rivera" size="sm" /> : null}
    </div>
  );
}

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

  const empty = messages.length === 0;

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        background: 'var(--surface-card)',
        border: '1px solid var(--border-subtle)',
        borderRadius: 'var(--radius-lg)',
        boxShadow: 'var(--shadow-sm)',
        overflow: 'hidden',
        minHeight: 520,
      }}
    >
      {/* AI header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          padding: '16px 28px',
          borderBottom: '1px solid var(--border-subtle)',
        }}
      >
        <AiBadge />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          <span
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'var(--text-base)',
              fontWeight: 'var(--weight-semibold)',
              color: 'var(--text-strong)',
            }}
          >
            Assistant
          </span>
          <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
            Answers grounded in your own data
          </span>
        </div>
      </div>

      {/* Message list */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '24px 28px' }}>
        {empty ? <Bubble role="ai">{GREETING}</Bubble> : null}

        {messages.map((m) => (
          <Bubble key={m.id} role={m.role === 'user' ? 'me' : 'ai'}>
            {textOf(m)}
          </Bubble>
        ))}

        {status === 'streaming' ? (
          <Bubble role="ai">
            <span style={{ color: 'var(--text-subtle)' }}>Thinking…</span>
          </Bubble>
        ) : null}

        {empty ? (
          <div
            style={{
              display: 'flex',
              gap: 8,
              flexWrap: 'wrap',
              paddingLeft: 46,
              marginTop: 4,
            }}
          >
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => submit(s)}
                style={{
                  cursor: 'pointer',
                  background: 'var(--surface-brand-sub)',
                  border: '1px solid var(--green-100)',
                  color: 'var(--green-800)',
                  borderRadius: 999,
                  padding: '8px 14px',
                  fontSize: 13,
                  fontWeight: 'var(--weight-semibold)',
                  fontFamily: 'var(--font-sans)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 7,
                }}
              >
                <Sparkles size={14} strokeWidth={2} aria-hidden="true" />
                {s}
              </button>
            ))}
          </div>
        ) : null}

        {error ? (
          <p
            style={{
              color: 'var(--text-muted)',
              fontSize: 'var(--text-sm)',
              margin: '4px 0 0 46px',
            }}
          >
            The assistant is not reachable yet. It comes online once the API is running.
          </p>
        ) : null}
      </div>

      {/* Composer */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          submit(input);
        }}
        style={{
          flex: 'none',
          padding: '14px 28px 20px',
          borderTop: '1px solid var(--border-subtle)',
          background: 'var(--surface-card)',
        }}
      >
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <div
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              background: 'var(--surface-sunken)',
              borderRadius: 999,
              padding: '0 8px 0 18px',
              height: 48,
            }}
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about your money…"
              aria-label="Message the assistant"
              style={{
                flex: 1,
                border: 'none',
                outline: 'none',
                background: 'none',
                fontSize: 15,
                fontFamily: 'var(--font-sans)',
                color: 'var(--text-strong)',
              }}
            />
          </div>
          <button
            type="submit"
            aria-label="Send"
            disabled={busy || !input.trim()}
            style={{
              width: 48,
              height: 48,
              borderRadius: 999,
              flex: 'none',
              background: 'var(--action-primary)',
              color: '#fff',
              border: 'none',
              cursor: busy || !input.trim() ? 'default' : 'pointer',
              opacity: busy || !input.trim() ? 0.5 : 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <ArrowUp size={20} strokeWidth={2} aria-hidden="true" />
          </button>
        </div>
      </form>
    </div>
  );
}
