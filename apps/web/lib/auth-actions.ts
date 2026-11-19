'use server';

import { DEMO, deleteAccount, demoPassword } from '@xd-memories/db';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { appSecret, getAuth } from './auth';
import { messageForAuthError, messageForDeleteError } from './auth-errors';

export type AuthFormState = { error: string | null };

const text = (form: FormData, name: string) => String(form.get(name) ?? '');

export async function signUp(_: AuthFormState, form: FormData): Promise<AuthFormState> {
  try {
    await getAuth().api.signUpEmail({
      body: {
        name: text(form, 'name'),
        email: text(form, 'email'),
        password: text(form, 'password'),
        // Where the mailed confirmation link lands, signed in.
        callbackURL: '/library',
      },
      headers: await headers(),
    });
  } catch (error) {
    return { error: messageForAuthError(error) };
  }
  redirect('/sign-up/sent');
}

export async function signIn(_: AuthFormState, form: FormData): Promise<AuthFormState> {
  try {
    await getAuth().api.signInEmail({
      body: {
        email: text(form, 'email'),
        password: text(form, 'password'),
        // Before the address is confirmed, sign-in mails a new link; it lands here.
        callbackURL: '/library',
      },
      headers: await headers(),
    });
  } catch (error) {
    return { error: messageForAuthError(error) };
  }
  redirect('/library');
}

// Mails a reset link if an account uses the address; the answer is the same either way.
export async function requestReset(_: AuthFormState, form: FormData): Promise<AuthFormState> {
  try {
    await getAuth().api.requestPasswordReset({
      body: { email: text(form, 'email'), redirectTo: '/reset-password' },
      headers: await headers(),
    });
  } catch (error) {
    return { error: messageForAuthError(error) };
  }
  redirect('/forgot-password/sent');
}

// The token comes from the mailed link, through the reset page.
export async function resetPassword(_: AuthFormState, form: FormData): Promise<AuthFormState> {
  try {
    await getAuth().api.resetPassword({
      body: { token: text(form, 'token'), newPassword: text(form, 'password') },
      headers: await headers(),
    });
  } catch (error) {
    return { error: messageForAuthError(error) };
  }
  redirect('/sign-in?password=changed');
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

// Deletes the signed-in account, asking for its password again: a session left open on a shared
// computer is not enough to delete someone's library.
export async function deleteMyAccount(_: AuthFormState, form: FormData): Promise<AuthFormState> {
  const result = await deleteAccount(getAuth(), {
    headers: await headers(),
    password: text(form, 'password'),
  });
  if (!result.ok) return { error: messageForDeleteError(result.error) };
  redirect('/account/deleted');
}
