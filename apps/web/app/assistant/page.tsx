import { PageHeader } from '@/components/layout/page-header';
import { getMe, type User } from '@/lib/resources';
import { safe } from '@/lib/safe';
import { Assistant } from '@/features/assistant/components/assistant';

export default async function AssistantPage() {
  const { data: me } = await safe<User | null>(() => getMe(), null);

  return (
    <>
      <PageHeader title="Assistant" subtitle="Ask about your money." hideActions />
      <div>
        <Assistant userName={me?.name ?? 'You'} />
      </div>
    </>
  );
}
