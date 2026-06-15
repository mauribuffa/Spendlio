import { cn } from '../cn';

export interface SegmentedOption<T extends string> {
  value: T;
  label: string;
}

export interface SegmentedControlProps<T extends string> {
  options: SegmentedOption<T>[];
  value: T;
  onChange: (value: T) => void;
  /** Accessible label for the group. */
  ariaLabel?: string;
  className?: string;
}

/**
 * A small inline tab/toggle. The active option lifts onto a card surface; the
 * track sits in the neutral well. Sentence case labels, no emoji.
 */
export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  ariaLabel,
  className,
}: SegmentedControlProps<T>) {
  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className={cn('spl-segmented', className)}
      style={{
        display: 'inline-flex',
        gap: '2px',
        padding: '3px',
        background: 'var(--neutral-100)',
        borderRadius: 'var(--radius-pill)',
        fontFamily: 'var(--font-body)',
      }}
    >
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            role="tab"
            aria-selected={active}
            data-active={active}
            onClick={() => onChange(opt.value)}
            className="spl-segmented__option"
            style={{
              padding: '6px 14px',
              border: 'none',
              borderRadius: 'var(--radius-pill)',
              background: 'transparent',
              color: active ? 'var(--color-ink)' : 'var(--color-ink-muted)',
              fontSize: 'var(--text-sm)',
              fontWeight: active ? 'var(--weight-semibold)' : 'var(--weight-medium)',
              cursor: 'pointer',
              transition: 'color var(--motion-fast) var(--ease-out)',
            }}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
