'use client';

import { useActionState } from 'react';
import type { AuthFormState } from './auth-actions';

type Props = {
  action: (state: AuthFormState, form: FormData) => Promise<AuthFormState>;
  submit: string;
  // Sign-up asks for a name and a new password; sign-in for the current one.
  isSignUp: boolean;
};

export function AuthForm({ action, submit, isSignUp }: Props) {
  const [state, formAction, pending] = useActionState(action, { error: null });

  return (
    <form action={formAction}>
      {isSignUp && (
        <>
          <label htmlFor="name">Name</label>
          <input id="name" name="name" autoComplete="name" required />
        </>
      )}
      <label htmlFor="email">Email</label>
      <input id="email" name="email" type="email" autoComplete="email" required />
      <label htmlFor="password">Password</label>
      <input
        id="password"
        name="password"
        type="password"
        autoComplete={isSignUp ? 'new-password' : 'current-password'}
        required
      />
      {state.error !== null && <p role="alert">{state.error}</p>}
      <button type="submit" disabled={pending}>
        {submit}
      </button>
    </form>
  );
}
