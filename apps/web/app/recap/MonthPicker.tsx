'use client';

import { useRouter } from 'next/navigation';
import { Select } from '@spendlio/ui';

/** Human label for a YYYY-MM month, e.g. "May 2026". */
function monthLabel(month: string): string {
  const [y = 0, m = 1] = month.split('-').map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

/**
 * Navigates the recap page between months by updating the `?month=` query.
 * `months` is newest-first (from recentMonths); `value` is the selected month.
 */
export function MonthPicker({ months, value }: { months: string[]; value: string }) {
  const router = useRouter();
  return (
    <Select
      aria-label="Recap month"
      value={value}
      options={months.map((m) => ({ value: m, label: monthLabel(m) }))}
      onChange={(e) => router.push(`/recap?month=${e.target.value}`)}
    />
  );
}
