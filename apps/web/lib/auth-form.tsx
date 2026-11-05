'use client';

import { useActionState } from 'react';
import type { AuthFormState } from './auth-actions';

type Props = {
  action: (state: AuthFormState, form: FormData) => Promise<AuthFormState>;
  submit: string;
  // What the form asks for. A password is the current one (sign-in) or a new one (sign-up,
  // reset), which tells password managers whether to fill one in or suggest one.
  name?: boolean;
  email?: boolean;
  password?: 'current-password' | 'new-password';
  // The reset token from the mailed link, sent back with the new password.
  token?: string;
};

export function AuthForm({ action, submit, name, email, password, token }: Props) {
  const [state, formAction, pending] = useActionState(action, { error: null });

  return (
    <form action={formAction}>
      {token !== undefined && <input type="hidden" name="token" value={token} />}
      {name && (
        <>
          <label htmlFor="name">Name</label>
          <input id="name" name="name" autoComplete="name" required />
        </>
      )}
      {email && (
        <>
          <label htmlFor="email">Email</label>
          <input id="email" name="email" type="email" autoComplete="email" required />
        </>
      )}
      {password !== undefined && (
        <>
          <label htmlFor="password">Password</label>
          <input id="password" name="password" type="password" autoComplete={password} required />
        </>
      )}
      {state.error !== null && <p role="alert">{state.error}</p>}
      <button type="submit" disabled={pending}>
        {submit}
      </button>
    </form>
  );
}
