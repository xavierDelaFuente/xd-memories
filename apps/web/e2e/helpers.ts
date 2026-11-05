import { randomUUID } from 'node:crypto';
import { expect, type Page } from '@playwright/test';
import { linkMailedTo } from './mail';

export const PASSWORD = 'correct horse battery';

// The E2E database outlives a run, so every test signs up its own user.
export async function signUpUnconfirmed(page: Page): Promise<string> {
  const email = `ada-${randomUUID()}@example.com`;
  await page.goto('/sign-up');
  await page.getByLabel('Name').fill('Ada');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill(PASSWORD);
  await page.getByRole('button', { name: 'Create account' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Check your email' })).toBeVisible();
  return email;
}

// Signs up and follows the mailed link, which lands in the library, signed in.
export async function signUp(page: Page): Promise<string> {
  const email = await signUpUnconfirmed(page);
  await page.goto(await linkMailedTo(email));
  await expect(page).toHaveURL(/\/library$/);
  return email;
}

export async function signIn(page: Page, email: string, password: string): Promise<void> {
  await page.goto('/sign-in');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill(password);
  await page.getByRole('button', { name: 'Sign in' }).click();
}
