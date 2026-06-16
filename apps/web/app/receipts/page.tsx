import Link from 'next/link';
import { ReceiptText } from 'lucide-react';
import { Card, EmptyState, MoneyAmount } from '@spendlio/ui';
import { listReceipts, type Receipt } from '@/lib/resources';
import { safe } from '@/lib/safe';
import { PageHeader } from '@/components/layout/page-header';
import { Notice } from '@/components/feedback/notice';
import { UploadReceipt } from '@/features/receipts/components/upload-receipt';
import { StatusBadge } from '@/features/receipts/components/status-badge';
import { PollWhileProcessing } from '@/features/receipts/components/poll-while-processing';

export const revalidate = 0;

export default async function ReceiptsPage() {
  const { data, error } = await safe(
    () => listReceipts(),
    { items: [] as Receipt[], nextCursor: null },
  );

  const anyProcessing = data.items.some((r) => r.status === 'processing');

  return (
    <div>
      <PageHeader eyebrow="Scan" title="Receipts" action={<UploadReceipt />} />

      {error ? (
        <Notice tone="warn">
          The API is not reachable yet, so this list is empty. Start the API (apps/api), the worker
          (apps/worker) and MinIO, then scan a receipt to see it here.
        </Notice>
      ) : null}

      <PollWhileProcessing active={anyProcessing} />

      {data.items.length === 0 ? (
        <Card padding="lg">
          <EmptyState
            icon={<ReceiptText />}
            title="No receipts yet"
            message="Scan a receipt and we'll pull out the merchant, total and line items for you."
          />
        </Card>
      ) : (
        <div style={{ display: 'grid', gap: 'var(--space-3)' }}>
          {data.items.map((r) => (
            <Link key={r.id} href={`/receipts/${r.id}`} style={{ display: 'block' }}>
              <Card padding="md">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 'var(--space-4)' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-1)', minWidth: 0 }}>
                    <span style={{ fontWeight: 'var(--weight-semibold)', color: 'var(--text-strong)' }}>
                      {r.merchant ?? 'Receipt'}
                    </span>
                    <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-subtle)' }}>
                      {r.purchasedAt
                        ? new Date(r.purchasedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                        : new Date(r.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)' }}>
                    {r.total != null && r.currency ? (
                      <MoneyAmount amount={-Math.abs(r.total)} currency={r.currency} color="off" />
                    ) : null}
                    <StatusBadge status={r.status} />
                  </div>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
