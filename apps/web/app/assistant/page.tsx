import { PageHeader } from '../_components/PageHeader';
import { Assistant } from './Assistant';

export default function AssistantPage() {
  return (
    <>
      <PageHeader title="Assistant" subtitle="Ask about your money." hideActions />
      <div style={{ maxWidth: 1160 }}>
        <Assistant />
      </div>
    </>
  );
}
