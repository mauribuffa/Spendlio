'use client';

import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Toast, type ToastTone } from '@spendlio/ui';

interface ToastItem {
  id: number;
  tone: ToastTone;
  message: ReactNode;
}

interface ToastApi {
  show: (message: ReactNode, tone?: ToastTone) => void;
  success: (message: ReactNode) => void;
  error: (message: ReactNode) => void;
}

const ToastContext = createContext<ToastApi | null>(null);

/** Push transient toasts from anywhere under <ToastProvider>. */
export function useToast(): ToastApi {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within <ToastProvider>');
  return ctx;
}

const AUTO_DISMISS_MS = 4000;

/**
 * Renders a portal stack of toasts and exposes `useToast()`. Wraps the app once
 * (in the root layout) so any client component can surface success/error
 * feedback. Each toast auto-dismisses; the API methods are stable across
 * renders so they're safe to use in effect dependency lists.
 */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const idRef = useRef(0);

  const remove = useCallback((id: number) => {
    setItems((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const show = useCallback(
    (message: ReactNode, tone: ToastTone = 'info') => {
      const id = (idRef.current += 1);
      setItems((prev) => [...prev, { id, tone, message }]);
      setTimeout(() => remove(id), AUTO_DISMISS_MS);
    },
    [remove],
  );

  const api = useMemo<ToastApi>(
    () => ({
      show,
      success: (message) => show(message, 'success'),
      error: (message) => show(message, 'error'),
    }),
    [show],
  );

  return (
    <ToastContext.Provider value={api}>
      {children}
      {typeof document !== 'undefined' &&
        createPortal(
          <div
            style={{
              position: 'fixed',
              left: 0,
              right: 0,
              bottom: 0,
              zIndex: 200,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 'var(--space-2)',
              padding: 'var(--space-4)',
              pointerEvents: 'none',
            }}
          >
            {items.map((t) => (
              <div key={t.id} style={{ pointerEvents: 'auto' }}>
                <Toast tone={t.tone} onDismiss={() => remove(t.id)}>
                  {t.message}
                </Toast>
              </div>
            ))}
          </div>,
          document.body,
        )}
    </ToastContext.Provider>
  );
}
