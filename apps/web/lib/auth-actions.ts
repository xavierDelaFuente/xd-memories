'use server';

import { DEMO, demoPassword } from '@xd-memories/db';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { appSecret, getAuth } from './auth';
import { messageForAuthError } from './auth-errors';

export type AuthFormState = { error: string | null };

const text = (form: FormData, name: string) => String(form.get(name) ?? '');

export async function signUp(_: AuthFormState, form: FormData): Promise<AuthFormState> {
  try {
    await getAuth().api.signUpEmail({
      body: {
        name: text(form, 'name'),
        email: text(form, 'email'),
        password: text(form, 'password'),
      },
      headers: await headers(),
    });
  } catch (error) {
    return { error: messageForAuthError(error) };
  }
  redirect('/library');
}

export async function signIn(_: AuthFormState, form: FormData): Promise<AuthFormState> {
  try {
    await getAuth().api.signInEmail({
      body: { email: text(form, 'email'), password: text(form, 'password') },
      headers: await headers(),
    });
  } catch (error) {
    return { error: messageForAuthError(error) };
  }
  redirect('/library');
}

export async function signOut(): Promise<void> {
  await getAuth().api.signOut({ headers: await headers() });
  redirect('/sign-in');
}

// "Try the demo": signs in to the read-only demo account. Its password derives from the app
// secret, so only the server knows it (packages/db demo.ts).
export async function tryDemo(): Promise<void> {
  await getAuth().api.signInEmail({
    body: { email: DEMO.email, password: demoPassword(appSecret()) },
    headers: await headers(),
  });
  redirect('/library');
}
