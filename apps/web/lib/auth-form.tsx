'use client';

import { useActionState } from 'react';
import type { AuthFormState } from './auth-actions';
import { Button, Input, Stack } from './ui';

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
      <Stack gap="lg">
        {token !== undefined && <input type="hidden" name="token" value={token} />}
        {name && <Input label="Name" name="name" autoComplete="name" required />}
        {email && <Input label="Email" name="email" type="email" autoComplete="email" required />}
        {password !== undefined && (
          <Input
            label="Password"
            name="password"
            type="password"
            autoComplete={password}
            required
          />
        )}
        {state.error !== null && (
          <p className="form-alert" role="alert">
            {state.error}
          </p>
        )}
        <Button type="submit" className="form-submit" disabled={pending}>
          {submit}
        </Button>
      </Stack>
    </form>
  );
}
