import { expect, type Page, test } from '@playwright/test';
import { PASSWORD, signIn, signUp, signUpUnconfirmed } from './helpers';
import { linkMailedTo, mailCountTo } from './mail';

// Scoped to main: Next.js adds its own (empty) route-announcer alert outside it.
const alertIn = (page: Page) => page.getByRole('main').getByRole('alert');

test('the link mailed on sign-up lands in your library, signed in', async ({ page }) => {
  const email = await signUp(page);

  await expect(page.getByRole('heading', { level: 1, name: 'Library' })).toBeVisible();
  await expect(page.getByText(`Signed in as ${email}`)).toBeVisible();
});

test('signed out, the library sends you to sign in', async ({ page }) => {
  await page.goto('/library');

  await expect(page).toHaveURL(/\/sign-in$/);
});

test('signing out and back in returns to your library', async ({ page }) => {
  const email = await signUp(page);
  await page.getByRole('button', { name: 'Sign out' }).click();
  await expect(page).toHaveURL(/\/sign-in$/);

  await signIn(page, email, PASSWORD);

  await expect(page).toHaveURL(/\/library$/);
  await expect(page.getByText(`Signed in as ${email}`)).toBeVisible();
});

test('a wrong password shows an error and keeps you signed out', async ({ page }) => {
  const email = await signUp(page);
  await page.getByRole('button', { name: 'Sign out' }).click();

  await signIn(page, email, 'not the password');

  await expect(alertIn(page)).toHaveText('Wrong email or password.');
  await page.goto('/library');
  await expect(page).toHaveURL(/\/sign-in$/);
});

test('signing in before confirming asks you to, and mails a new link', async ({ page }) => {
  const email = await signUpUnconfirmed(page);

  await signIn(page, email, PASSWORD);

  await expect(alertIn(page)).toHaveText("Confirm your email first: we've sent you a new link.");
  await expect.poll(() => mailCountTo(email)).toBe(2);
});

test('a forgotten password is reset from the mailed link', async ({ page }) => {
  const email = await signUp(page);
  await page.getByRole('button', { name: 'Sign out' }).click();
  await page.getByRole('link', { name: 'Forgot your password?' }).click();
  // Sign-in has an Email field too: wait for the new page before filling one in.
  await expect(page.getByRole('heading', { level: 1, name: 'Reset your password' })).toBeVisible();
  await page.getByLabel('Email').fill(email);
  await page.getByRole('button', { name: 'Email me a link' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Check your email' })).toBeVisible();
  await page.goto(await linkMailedTo(email));
  await page.getByLabel('Password').fill('a brand new password');
  await page.getByRole('button', { name: 'Set password' }).click();
  await expect(page.getByRole('status')).toHaveText(
    'Your password is changed. Sign in with the new one.',
  );

  await signIn(page, email, 'a brand new password');

  await expect(page).toHaveURL(/\/library$/);
});

test('a used or broken reset link says so', async ({ page }) => {
  await page.goto('/reset-password?error=INVALID_TOKEN');

  await expect(alertIn(page)).toHaveText(
    'This link has expired or was already used. Ask for a new one.',
  );
});
