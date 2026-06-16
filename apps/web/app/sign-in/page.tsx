import { SignInForm } from '@/features/auth/components/sign-in-form';

// Bare page (the root layout renders no AppShell when there's no session).
export default function SignInPage() {
  return (
    <div
      style={{
        minHeight: '100dvh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
        background:
          'radial-gradient(700px 460px at 50% -5%, var(--green-50), transparent 70%), var(--surface-canvas)',
        fontFamily: 'var(--font-sans)',
      }}
    >
      <SignInForm devEnabled={process.env.NODE_ENV !== 'production'} />
    </div>
  );
}
