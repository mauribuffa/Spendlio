import { Card, Avatar, Badge } from '@spendlio/ui';
import { getMe, type User } from '../../lib/resources';
import { safe } from '../../lib/safe';
import { PageHeader } from '../_components/PageHeader';
import { Notice } from '../_components/Notice';
import { SettingsForm } from './SettingsForm';

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

      {data ? (
        <SettingsForm user={data} />
      ) : (
        <Card padding="lg">
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
            <Avatar name="Demo User" size="lg" />
            <div>
              <p style={{ color: 'var(--text-subtle)' }}>No profile loaded.</p>
              <Badge tone="neutral">Dev mode · demo user</Badge>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
