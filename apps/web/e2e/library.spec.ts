import { expect, test } from '@playwright/test';
import { signUp } from './helpers';

const DUNE = 'Dune (1965) — Frank Herbert';

test('adding a search result lists it in your library, at its status', async ({ page }) => {
  await signUp(page);
  await page.goto('/catalog/books?q=dune');
  await page.getByRole('combobox', { name: `Status for ${DUNE}` }).selectOption('Done');

  await page.getByRole('button', { name: `Add ${DUNE}` }).click();

  await expect(page.getByRole('status')).toHaveText('Added to your library as Done.');
  await page.goto('/library');
  await expect(page.getByRole('list', { name: 'Your library' }).getByRole('listitem')).toHaveText([
    `${DUNE} · Done`,
  ]);
});

test('a search result edited in the browser is not added', async ({ page }) => {
  await signUp(page);
  await page.goto('/catalog/books?q=dune');
  await page
    .getByRole('listitem')
    .filter({ hasText: DUNE })
    .locator('input[name="item"]')
    .evaluate((input: HTMLInputElement) => {
      input.value = `x${input.value}`;
    });

  await page.getByRole('button', { name: `Add ${DUNE}` }).click();

  await expect(page.getByRole('main').getByRole('alert')).toHaveText(
    'This result can’t be added. Search again and retry.',
  );
  await page.goto('/library');
  await expect(page.getByText('Nothing here yet.')).toBeVisible();
});

test('signed out, search results offer no Add', async ({ page }) => {
  await page.goto('/catalog/books?q=dune');

  await expect(page.getByRole('list', { name: 'Results' })).toBeVisible();
  await expect(page.getByRole('button', { name: /^Add / })).toHaveCount(0);
});
