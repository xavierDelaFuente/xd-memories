import { Alert } from '@asnewyla/alert';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { currentSession } from '../../lib/auth';
import { signIn } from '../../lib/auth-actions';
import { AuthForm } from '../../lib/auth-form';

type Props = { searchParams: Promise<{ password?: string | string[] }> };

export default async function SignInPage({ searchParams }: Props) {
  if (await currentSession()) redirect('/library');
  // Set by a password reset (resetPassword in auth-actions.ts).
  const { password } = await searchParams;

  return (
    <>
      <h1>Sign in</h1>
      {password === 'changed' && (
        <Alert tone="success">Your password is changed. Sign in with the new one.</Alert>
      )}
      <AuthForm action={signIn} submit="Sign in" email password="current-password" />
      <p>
        <Link href="/forgot-password">Forgot your password?</Link>
      </p>
      <p>
        New here? <Link href="/sign-up">Create an account</Link>
      </p>
    </>
  );
}
