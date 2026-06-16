import { Card, Avatar, Badge } from '@spendlio/ui';
import { getMe, type User } from '@/lib/resources';
import { safe } from '@/lib/safe';
import { PageHeader } from '@/components/layout/page-header';
import { Notice } from '@/components/feedback/notice';
import { SettingsForm } from '@/features/settings/components/settings-form';

export default async function SettingsPage() {
  const { data, error } = await safe<User | null>(() => getMe(), null);

  return (
    <>
      <PageHeader eyebrow="Account" title="Settings" hideActions />

      <div style={{ maxWidth: 760 }}>
        {error ? (
          <Notice tone="warn">
            The API is not reachable yet. Your profile will appear once apps/api is running and the
            demo user is seeded.
          </Notice>
        ) : null}

        {data ? (
          <SettingsForm user={data} />
        ) : (
          <Card padding="lg" style={{ borderRadius: 'var(--radius-xl)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <Avatar name="Demo User" size="lg" />
              <div>
                <p style={{ margin: '0 0 var(--space-2)', color: 'var(--text-subtle)' }}>No profile loaded.</p>
                <Badge tone="neutral">Dev mode · demo user</Badge>
              </div>
            </div>
          </Card>
        )}
      </div>
    </>
  );
}
