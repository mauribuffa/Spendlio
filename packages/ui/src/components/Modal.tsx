'use client';

import { useEffect, useId, useRef } from 'react';
import { createPortal } from 'react-dom';
import type { ReactNode } from 'react';
import { X } from 'lucide-react';
import { cn } from '../cn';

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  /** Header title. Omit for a bare panel. */
  title?: ReactNode;
  /** Accessible name when there is no visible `title`. */
  ariaLabel?: string;
  children: ReactNode;
  /** Max panel width in px. */
  width?: number;
  className?: string;
}

const FOCUSABLE =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Centered modal dialog — warm-ink scrim + a rounded-2xl card panel. The web
 * analogue of the iOS bottom sheet. Escape and scrim-click close it; body
 * scroll is locked while open. Focus moves into the panel on open, is trapped
 * within it (Tab/Shift+Tab wrap), and is restored to the trigger on close.
 */
export function Modal({ open, onClose, title, ariaLabel, children, width = 480, className }: ModalProps) {
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const restoreRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return;
    // Remember what had focus so we can restore it when the modal closes.
    restoreRef.current = (document.activeElement as HTMLElement | null) ?? null;

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
        return;
      }
      if (e.key !== 'Tab') return;
      const panel = panelRef.current;
      if (!panel) return;
      const items = Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
        (el) => el.offsetParent !== null || el === document.activeElement,
      );
      if (items.length === 0) {
        e.preventDefault();
        panel.focus();
        return;
      }
      const first = items[0]!;
      const last = items[items.length - 1]!;
      const active = document.activeElement as HTMLElement | null;
      if (e.shiftKey && (active === first || !panel.contains(active))) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    // Move focus into the panel (first focusable, else the panel itself).
    const panel = panelRef.current;
    const firstFocusable = panel?.querySelector<HTMLElement>(FOCUSABLE);
    (firstFocusable ?? panel)?.focus();

    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
      restoreRef.current?.focus?.();
    };
  }, [open, onClose]);

  if (!open || typeof document === 'undefined') return null;

  // Portal to <body> so a transformed/blurred ancestor (e.g. the sticky
  // backdrop-blurred topbar) can't become the fixed-position containing block.
  return createPortal(
    <div
      className="spl-modal__overlay"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 100,
      }}
    >
      <div
        className="spl-modal__scrim"
        onClick={onClose}
        style={{ position: 'absolute', inset: 0, background: 'var(--surface-overlay)' }}
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title != null ? titleId : undefined}
        aria-label={title == null ? ariaLabel : undefined}
        tabIndex={-1}
        className={cn('spl-modal__panel', className)}
        style={{
          position: 'relative',
          width,
          maxWidth: '100%',
          background: 'var(--surface-card)',
          boxShadow: 'var(--shadow-xl)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        {title != null && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 'var(--space-3)',
              padding: '18px 22px 14px',
              flex: 'none',
            }}
          >
            <span
              id={titleId}
              style={{
                fontFamily: 'var(--font-display)',
                fontWeight: 'var(--weight-bold)',
                fontSize: 20,
                letterSpacing: '-0.01em',
                color: 'var(--text-strong)',
              }}
            >
              {title}
            </span>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              style={{
                cursor: 'pointer',
                border: 'none',
                background: 'var(--surface-sunken)',
                borderRadius: 999,
                width: 32,
                height: 32,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--text-muted)',
                flex: 'none',
              }}
            >
              <X size={18} strokeWidth={2} aria-hidden="true" />
            </button>
          </div>
        )}
        <div style={{ flex: 1, overflowY: 'auto' }}>{children}</div>
      </div>
    </div>,
    document.body,
  );
}
