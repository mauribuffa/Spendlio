'use client';

import { useState } from 'react';
import { Plus, ScanLine } from 'lucide-react';
import { Button, Modal } from '@spendlio/ui';
import { AddTransactionForm } from '../transactions/AddTransactionForm';
import { UploadReceipt } from '../receipts/UploadReceipt';

/**
 * The global topbar actions: Scan a receipt + Add expense. Each opens a modal
 * that reuses the real, wired forms (no new endpoints). The add-expense modal
 * closes itself once a transaction is created.
 */
export function TopbarActions() {
  const [addOpen, setAddOpen] = useState(false);
  const [scanOpen, setScanOpen] = useState(false);

  return (
    <>
      <Button
        variant="secondary"
        size="md"
        leadingIcon={<ScanLine size={17} strokeWidth={2} aria-hidden="true" />}
        onClick={() => setScanOpen(true)}
      >
        Scan
      </Button>
      <Button
        variant="primary"
        size="md"
        leadingIcon={<Plus size={17} strokeWidth={2} aria-hidden="true" />}
        onClick={() => setAddOpen(true)}
      >
        Add expense
      </Button>

      <Modal open={addOpen} onClose={() => setAddOpen(false)} title="Add expense" width={520}>
        <div style={{ padding: '4px 22px 24px' }}>
          <AddTransactionForm bare onSuccess={() => setAddOpen(false)} />
        </div>
      </Modal>

      <Modal open={scanOpen} onClose={() => setScanOpen(false)} title="Scan receipt" width={460}>
        <div style={{ padding: '4px 22px 26px', display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 'var(--space-3)',
              padding: '28px 20px',
              border: '1px dashed var(--green-300)',
              background: 'var(--surface-brand-sub)',
              borderRadius: 'var(--radius-lg)',
              textAlign: 'center',
            }}
          >
            <span
              style={{
                width: 44,
                height: 44,
                borderRadius: 999,
                background: 'var(--green-600)',
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <ScanLine size={20} strokeWidth={2} aria-hidden="true" />
            </span>
            <span style={{ fontSize: 'var(--text-sm)', color: 'var(--green-800)', maxWidth: 280, lineHeight: 1.5 }}>
              Upload a photo of your receipt. We&rsquo;ll read the line items and add them for you.
            </span>
            <UploadReceipt />
          </div>
        </div>
      </Modal>
    </>
  );
}
