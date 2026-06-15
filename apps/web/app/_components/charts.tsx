import type { ReactNode } from 'react';

export interface DonutSlice {
  /** Slice weight (any positive unit). */
  value: number;
  /** Fill color (token or hex). */
  color: string;
}

/**
 * Hollow donut chart drawn with a single conic-gradient — no SVG, no deps.
 * The center shows an optional eyebrow label + value.
 */
export function Donut({
  data,
  size = 168,
  thickness = 26,
  total,
  centerLabel,
  centerValue,
}: {
  data: DonutSlice[];
  size?: number;
  thickness?: number;
  total?: number;
  centerLabel?: ReactNode;
  centerValue?: ReactNode;
}) {
  const sum = total ?? data.reduce((s, d) => s + d.value, 0);
  let acc = 0;
  const stops =
    sum > 0
      ? data
          .map((d) => {
            const start = (acc / sum) * 360;
            acc += d.value;
            const end = (acc / sum) * 360;
            return `${d.color} ${start}deg ${end}deg`;
          })
          .join(', ')
      : 'var(--surface-inset) 0deg 360deg';
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        position: 'relative',
        flex: 'none',
        background: `conic-gradient(${stops})`,
      }}
    >
      <div
        style={{
          position: 'absolute',
          inset: thickness,
          borderRadius: '50%',
          background: 'var(--surface-card)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {centerLabel != null && (
          <div
            style={{
              fontSize: 11,
              color: 'var(--text-subtle)',
              fontWeight: 'var(--weight-semibold)',
              letterSpacing: '.04em',
              textTransform: 'uppercase',
            }}
          >
            {centerLabel}
          </div>
        )}
        {centerValue != null && (
          <div
            data-money
            style={{
              fontFamily: 'var(--font-display)',
              fontWeight: 'var(--weight-bold)',
              fontSize: 24,
              color: 'var(--text-strong)',
              letterSpacing: '-0.01em',
            }}
          >
            {centerValue}
          </div>
        )}
      </div>
    </div>
  );
}

export interface BarDatum {
  /** X-axis label (e.g. month abbreviation). */
  label: string;
  /** Bar value. */
  value: number;
  /** Optional caption rendered above the bar (e.g. on the latest column). */
  caption?: string;
}

/**
 * Monthly spend bar chart built from divs. The last column is highlighted in
 * brand green; the rest sit in a soft green tint.
 */
export function BarChart({ data, height = 150 }: { data: BarDatum[]; height?: number }) {
  const max = Math.max(1, ...data.map((m) => m.value));
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 14, height }}>
      {data.map((m, i) => {
        const last = i === data.length - 1;
        return (
          <div
            key={`${m.label}-${i}`}
            style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, height: '100%' }}
          >
            <div style={{ flex: 1, width: '100%', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
              <div
                style={{
                  width: '62%',
                  maxWidth: 38,
                  height: `${(m.value / max) * 100}%`,
                  borderRadius: '8px 8px 4px 4px',
                  background: last ? 'var(--green-600)' : 'var(--green-200)',
                  boxShadow: last ? 'var(--shadow-brand)' : 'none',
                  position: 'relative',
                }}
              >
                {m.caption && (
                  <div
                    data-money
                    style={{
                      position: 'absolute',
                      top: -22,
                      left: '50%',
                      transform: 'translateX(-50%)',
                      fontSize: 11.5,
                      fontWeight: 'var(--weight-bold)',
                      color: 'var(--green-800)',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {m.caption}
                  </div>
                )}
              </div>
            </div>
            <span style={{ fontSize: 12, fontWeight: last ? 'var(--weight-bold)' : 'var(--weight-medium)', color: last ? 'var(--text-strong)' : 'var(--text-subtle)' }}>
              {m.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}
