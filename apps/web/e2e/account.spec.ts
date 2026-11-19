import { expect, type Page, test } from '@playwright/test';
import { PASSWORD, signIn, signUp } from './helpers';

const deleteWith = async (page: Page, password: string) => {
  await page.goto('/library');
  await page.getByRole('link', { name: 'Account', exact: true }).click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Account');
  await page.getByLabel('Password').fill(password);
  await page.getByRole('button', { name: 'Delete my account' }).click();
};

test('deleting your account with your password signs you out for good', async ({ page }) => {
  const email = await signUp(page);
  await page.goto('/catalog/books?q=dune');
  await page
    .getByRole('group', { name: 'Add Dune (1965) — Frank Herbert' })
    .getByRole('button', { name: 'Reading' })
    .click();
  await expect(page.getByRole('status')).toHaveText('Added to your library as Reading.');

  await deleteWith(page, PASSWORD);

  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Your account is deleted');
  await page.goto('/library');
  await expect(page).toHaveURL(/\/sign-in$/);
  await signIn(page, email, PASSWORD);
  await expect(page.getByRole('main').getByRole('alert')).toHaveText('Wrong email or password.');
});

test('a wrong password deletes nothing', async ({ page }) => {
  await signUp(page);

  await deleteWith(page, 'not my password');

  await expect(page.getByRole('main').getByRole('alert')).toHaveText(
    'That password isn’t right. Your account is unchanged.',
  );
  await page.goto('/library');
  await expect(page).toHaveURL(/\/library$/);
});

test('the demo account offers no way to delete it', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Try the demo' }).click();
  await expect(page).toHaveURL(/\/library$/);

  await page.goto('/account');

  await expect(page.getByText('The demo account can’t be deleted')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Delete my account' })).toHaveCount(0);
});

test('signed out, the account page sends you to sign in', async ({ page }) => {
  await page.goto('/account');

  await expect(page).toHaveURL(/\/sign-in$/);
});
