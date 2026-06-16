import type { ReactNode } from 'react';
import { FieldError } from './field-error';

export interface FormFieldProps {
  /** Matches the `id` on the control so the label is associated with it. */
  htmlFor?: string;
  label: ReactNode;
  /** First validation message for this field, if any. */
  error?: ReactNode;
  children: ReactNode;
}

const labelStyle = {
  display: 'block',
  fontSize: 'var(--text-sm)',
  fontWeight: 'var(--weight-medium)',
  color: 'var(--text-muted)',
  marginBottom: 'var(--space-1)',
} as const;

/**
 * A labelled form field: label + control + inline error. The label associates
 * with the control via `htmlFor` — pass the matching `id` on the child control.
 * Replaces the per-form `labelStyle` + `FieldError` that used to be copied into
 * every form.
 */
export function FormField({ htmlFor, label, error, children }: FormFieldProps) {
  return (
    <div>
      <label htmlFor={htmlFor} style={labelStyle}>
        {label}
      </label>
      {children}
      <FieldError>{error}</FieldError>
    </div>
  );
}
