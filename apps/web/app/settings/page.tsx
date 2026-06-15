import { Card, Avatar, Badge } from '@spendlio/ui';
import { getMe, type User } from '../../lib/resources';
import { safe } from '../../lib/safe';
import { PageHeader } from '../_components/PageHeader';
import { Notice } from '../_components/Notice';

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        padding: 'var(--space-3) 0',
        borderBottom: '1px solid var(--color-border)',
        fontSize: 'var(--text-sm)',
      }}
    >
      <span style={{ color: 'var(--color-ink-muted)' }}>{label}</span>
      <span style={{ fontWeight: 'var(--weight-medium)' }}>{value}</span>
    </div>
  );
}

export default async function SettingsPage() {
  const { data, error } = await safe<User | null>(() => getMe(), null);

  return (
    <div>
      <PageHeader eyebrow="Account" title="Settings" />

      {error ? (
        <Notice tone="warn">
          The API is not reachable yet. Your profile will appear once apps/api is running and the
          demo user is seeded.
        </Notice>
      ) : null}

      <Card padding="lg">
        {data ? (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)', marginBottom: 'var(--space-5)' }}>
              <Avatar name={data.name} size="lg" />
              <div>
                <div style={{ fontFamily: 'var(--font-display)', fontWeight: 'var(--weight-bold)', fontSize: 'var(--text-xl)' }}>
                  {data.name}
                </div>
                <div style={{ color: 'var(--color-ink-muted)', fontSize: 'var(--text-sm)' }}>{data.email}</div>
              </div>
            </div>
            <Row label="Default currency" value={data.defaultCurrency} />
            <Row label="Locale" value={data.locale} />
            <Row label="Timezone" value={data.timezone} />
          </>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
            <Avatar name="Demo User" size="lg" />
            <div>
              <p style={{ color: 'var(--color-ink-subtle)' }}>No profile loaded.</p>
              <Badge tone="neutral">Dev mode · demo user</Badge>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
