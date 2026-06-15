'use client';

import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import type { ReactNode } from 'react';
import { X } from 'lucide-react';
import { cn } from '../cn';

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  /** Header title. Omit for a bare panel. */
  title?: ReactNode;
  children: ReactNode;
  /** Max panel width in px. */
  width?: number;
  className?: string;
}

/**
 * Centered modal dialog — warm-ink scrim + a rounded-2xl card panel. The web
 * analogue of the iOS bottom sheet. Escape and scrim-click close it; body
 * scroll is locked while open.
 */
export function Modal({ open, onClose, title, children, width = 480, className }: ModalProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open || typeof document === 'undefined') return null;

  // Portal to <body> so a transformed/blurred ancestor (e.g. the sticky
  // backdrop-blurred topbar) can't become the fixed-position containing block.
  return createPortal(
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 100,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
      }}
    >
      <div
        className="spl-modal__scrim"
        onClick={onClose}
        style={{ position: 'absolute', inset: 0, background: 'var(--surface-overlay)' }}
      />
      <div
        role="dialog"
        aria-modal="true"
        className={cn('spl-modal__panel', className)}
        style={{
          position: 'relative',
          width,
          maxWidth: '100%',
          maxHeight: '90vh',
          background: 'var(--surface-card)',
          borderRadius: 'var(--radius-sheet)',
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
