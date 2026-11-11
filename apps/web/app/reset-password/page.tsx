import { Alert } from '@asnewyla/alert';
import Link from 'next/link';
import { resetPassword } from '../../lib/auth-actions';
import { messageForAuthCode } from '../../lib/auth-errors';
import { AuthForm } from '../../lib/auth-form';

type Props = { searchParams: Promise<{ token?: string | string[]; error?: string | string[] }> };

// The mailed link checks its token, then lands here with ?token=, or with ?error= when the
// token has expired or was used.
export default async function ResetPasswordPage({ searchParams }: Props) {
  const { token, error } = await searchParams;

  if (typeof token !== 'string' || error !== undefined) {
    return (
      <>
        <h1>Reset your password</h1>
        <Alert tone="error">
          {messageForAuthCode(typeof error === 'string' ? error : 'INVALID_TOKEN')}
        </Alert>
        <p>
          <Link href="/forgot-password">Ask for a new link</Link>
        </p>
      </>
    );
  }

  return (
    <>
      <h1>Choose a new password</h1>
      <AuthForm
        action={resetPassword}
        submit="Set password"
        password="new-password"
        token={token}
      />
    </>
  );
}
