import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Card, MoneyAmount } from '@spendlio/ui';
import { getReceipt, getReceiptImageUrl } from '../../../lib/resources';
import { ApiError } from '../../../lib/api';
import { safe } from '../../../lib/safe';
import { PageHeader } from '../../_components/PageHeader';
import { Notice } from '../../_components/Notice';
import { StatusBadge } from '../StatusBadge';
import { PollWhileProcessing } from '../PollWhileProcessing';

export const revalidate = 0;

export default async function ReceiptDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { data: receipt, error } = await safe(() => getReceipt(id), null);
  // The image lives in private storage; fetch a short-lived presigned URL to show it.
  const { data: imageUrl } = await safe(() => getReceiptImageUrl(id), null);

  // A 404 from the API (wrong/deleted id) is a real not-found, not an outage.
  if (!receipt && error?.includes('(404)')) notFound();

  if (!receipt) {
    return (
      <div>
        <PageHeader eyebrow="Receipt" title="Receipt" />
        <Notice tone="warn">
          Could not load this receipt — start the API (apps/api) and try again.
        </Notice>
        <Link href="/receipts" style={{ color: 'var(--green-900)', fontSize: 'var(--text-sm)' }}>
          ← Back to receipts
        </Link>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        eyebrow="Receipt"
        title={receipt.merchant ?? 'Receipt'}
        action={<StatusBadge status={receipt.status} />}
      />

      <PollWhileProcessing active={receipt.status === 'processing'} />

      <Link
        href="/receipts"
        style={{ display: 'inline-block', color: 'var(--green-900)', fontSize: 'var(--text-sm)', marginBottom: 'var(--space-4)' }}
      >
        ← Back to receipts
      </Link>

      {imageUrl ? (
        <Card padding="sm" style={{ marginBottom: 'var(--space-5)' }}>
          {/* eslint-disable-next-line @next/next/no-img-element -- presigned storage URL, not a static asset */}
          <img
            src={imageUrl}
            alt={receipt.merchant ? `Receipt from ${receipt.merchant}` : 'Receipt image'}
            style={{ display: 'block', width: '100%', maxHeight: 520, objectFit: 'contain', borderRadius: 'var(--radius-md)' }}
          />
        </Card>
      ) : null}

      <Card padding="lg" style={{ marginBottom: 'var(--space-5)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 'var(--space-4)' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-1)' }}>
            <span style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}>
              {receipt.merchant ?? 'Merchant pending'}
            </span>
            <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-subtle)' }}>
              {receipt.purchasedAt
                ? new Date(receipt.purchasedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                : 'Date pending'}
            </span>
          </div>
          {receipt.total != null && receipt.currency ? (
            <MoneyAmount amount={-Math.abs(receipt.total)} currency={receipt.currency} size="xl" color="off" />
          ) : (
            <span style={{ color: 'var(--text-subtle)' }}>
              {receipt.status === 'processing' ? 'Reading total…' : 'No total found'}
            </span>
          )}
        </div>
      </Card>

      {receipt.lineItems.length > 0 ? (
        <Card padding="sm">
          <div style={{ display: 'grid', gap: '2px' }}>
            {receipt.lineItems.map((li, i) => (
              <div
                key={i}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: 'var(--space-4)',
                  padding: 'var(--space-3) var(--space-4)',
                }}
              >
                <span style={{ color: 'var(--text-strong)' }}>
                  {li.quantity > 1 ? `${li.quantity}× ` : ''}{li.description}
                </span>
                {receipt.currency ? (
                  <MoneyAmount amount={-Math.abs(li.amount)} currency={receipt.currency} size="sm" color="off" />
                ) : null}
              </div>
            ))}
          </div>
        </Card>
      ) : (
        <Notice tone="info">
          {receipt.status === 'processing'
            ? 'Still reading the receipt — line items will appear here once OCR finishes.'
            : receipt.status === 'failed'
              ? 'We couldn\'t read this receipt. Try scanning a clearer photo.'
              : 'No line items were detected on this receipt.'}
        </Notice>
      )}

      {/*
        Note: there is no backend route to create a transaction from a receipt
        (the receipts controller exposes no link/convert endpoint, and nothing
        sets ReceiptSchema.transactionId). The "create transaction from receipt"
        action is intentionally omitted until that endpoint exists.
      */}
    </div>
  );
}
