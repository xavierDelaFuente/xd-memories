import { randomUUID } from 'node:crypto';
import { expect, type Page } from '@playwright/test';

export const PASSWORD = 'correct horse battery';

// The E2E database outlives a run, so every test signs up its own user.
export async function signUp(page: Page): Promise<string> {
  const email = `ada-${randomUUID()}@example.com`;
  await page.goto('/sign-up');
  await page.getByLabel('Name').fill('Ada');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill(PASSWORD);
  await page.getByRole('button', { name: 'Create account' }).click();
  await expect(page).toHaveURL(/\/library$/);
  return email;
}
