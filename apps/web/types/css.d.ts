// Allow CSS custom properties in inline `style={{ ... }}` objects, e.g.
//   <div className={cn('spl-grid-asym')} style={{ '--spl-cols': '1fr 1.7fr' }} />
// The responsive `.spl-*` utilities read these per-instance vars (see ADR-031),
// so the whole app needs them to typecheck without a per-site cast.
import type {} from 'react';

declare module 'react' {
  interface CSSProperties {
    [key: `--${string}`]: string | number | undefined;
  }
}
