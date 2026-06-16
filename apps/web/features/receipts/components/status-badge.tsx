import { Badge } from '@spendlio/ui';
import type { ReceiptStatus } from '@spendlio/contracts';

const TONE: Record<ReceiptStatus, { tone: 'accent' | 'positive' | 'negative'; label: string }> = {
  processing: { tone: 'accent', label: 'Processing' },
  parsed: { tone: 'positive', label: 'Parsed' },
  failed: { tone: 'negative', label: 'Failed' },
};

export function StatusBadge({ status }: { status: ReceiptStatus }) {
  const { tone, label } = TONE[status];
  return <Badge tone={tone}>{label}</Badge>;
}
