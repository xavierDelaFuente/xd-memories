import Link from 'next/link';
import { redirect } from 'next/navigation';
import { currentSession } from '../../lib/auth';
import { signIn } from '../../lib/auth-actions';
import { AuthForm } from '../../lib/auth-form';

export default async function SignInPage() {
  if (await currentSession()) redirect('/library');

  return (
    <>
      <h1>Sign in</h1>
      <AuthForm action={signIn} submit="Sign in" isSignUp={false} />
      <p>
        New here? <Link href="/sign-up">Create an account</Link>
      </p>
    </>
  );
}
