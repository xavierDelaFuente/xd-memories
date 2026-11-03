import { randomUUID } from 'node:crypto';
import { expect, type Page, test } from '@playwright/test';

const PASSWORD = 'correct horse battery';

// The E2E database outlives a run, so every test signs up its own user.
async function signUp(page: Page): Promise<string> {
  const email = `ada-${randomUUID()}@example.com`;
  await page.goto('/sign-up');
  await page.getByLabel('Name').fill('Ada');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill(PASSWORD);
  await page.getByRole('button', { name: 'Create account' }).click();
  await expect(page).toHaveURL(/\/library$/);
  return email;
}

async function signIn(page: Page, email: string, password: string): Promise<void> {
  await page.goto('/sign-in');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill(password);
  await page.getByRole('button', { name: 'Sign in' }).click();
}

test('signing up lands in your library, signed in', async ({ page }) => {
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

  // Scoped to main: Next.js adds its own (empty) route-announcer alert outside it.
  await expect(page.getByRole('main').getByRole('alert')).toHaveText('Wrong email or password.');
  await page.goto('/library');
  await expect(page).toHaveURL(/\/sign-in$/);
});
