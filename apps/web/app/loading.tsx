import { Card, Skeleton, SkeletonRow } from '@spendlio/ui';

/**
 * Route-level loading fallback. Shown via Suspense while a server component
 * page fetches its data (pages use `cache: no-store`, so this is meaningful on
 * every navigation). The shell (sidebar / mobile top bar) stays put.
 */
export default function Loading() {
  return (
    <div style={{ paddingTop: 24, display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <Skeleton width={90} height={11} text />
        <Skeleton width={210} height={30} />
      </div>
      <Card padding="lg">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {Array.from({ length: 6 }).map((_, i) => (
            <SkeletonRow key={i} />
          ))}
        </div>
      </Card>
    </div>
  );
}
