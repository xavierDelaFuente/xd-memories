import Link from 'next/link';
import { redirect } from 'next/navigation';
import { currentSession } from '../../lib/auth';
import { signUp } from '../../lib/auth-actions';
import { AuthForm } from '../../lib/auth-form';

export default async function SignUpPage() {
  if (await currentSession()) redirect('/library');

  return (
    <>
      <h1>Create your account</h1>
      <AuthForm
        action={signUp}
        submit="Create account"
        name
        email
        password="new-password"
        note={
          <>
            What we keep and who sees it is in the <Link href="/privacy">privacy note</Link>.
          </>
        }
      />
      <p>
        Already have an account? <Link href="/sign-in">Sign in</Link>
      </p>
    </>
  );
}
