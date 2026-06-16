import { PageHeader } from '../_components/PageHeader';
import { getMe, type User } from '../../lib/resources';
import { safe } from '../../lib/safe';
import { Assistant } from './Assistant';

export default async function AssistantPage() {
  const { data: me } = await safe<User | null>(() => getMe(), null);

  return (
    <>
      <PageHeader title="Assistant" subtitle="Ask about your money." hideActions />
      <div style={{ maxWidth: 1160 }}>
        <Assistant userName={me?.name ?? 'You'} />
      </div>
    </>
  );
}
