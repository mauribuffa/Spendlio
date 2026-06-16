import Link from 'next/link';
import { Compass } from 'lucide-react';
import { Card, EmptyState } from '@spendlio/ui';

/** Route-level 404 page. */
export default function NotFound() {
  return (
    <div style={{ paddingTop: 40 }}>
      <Card padding="lg">
        <EmptyState
          icon={<Compass size={22} strokeWidth={2} aria-hidden="true" />}
          title="Page not found"
          message="That page doesn't exist or has moved."
          action={
            <Link
              href="/"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                padding: '10px 18px',
                borderRadius: 'var(--radius-pill)',
                background: 'var(--green-600)',
                color: '#fff',
                fontWeight: 'var(--weight-semibold)',
                fontSize: 14,
              }}
            >
              Back to overview
            </Link>
          }
        />
      </Card>
    </div>
  );
}
