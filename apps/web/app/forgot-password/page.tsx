import { requestReset } from '../../lib/auth-actions';
import { AuthForm } from '../../lib/auth-form';

export default function ForgotPasswordPage() {
  return (
    <>
      <h1>Reset your password</h1>
      <p>Enter your email and we'll send you a link to set a new password.</p>
      <AuthForm action={requestReset} submit="Email me a link" email />
    </>
  );
}
