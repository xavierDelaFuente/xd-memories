import { expect, type Page, test } from '@playwright/test';
import { signUp } from './helpers';

const DUNE = 'Dune (1965) — Frank Herbert';

const addDune = async (page: Page, status: string) => {
  await page.goto('/catalog/books?q=dune');
  await page.getByRole('combobox', { name: `Status for ${DUNE}` }).selectOption(status);
  await page.getByRole('button', { name: `Add ${DUNE}` }).click();
  await expect(page.getByRole('status')).toHaveText(`Added to your library as ${status}.`);
};

const libraryHeadings = (page: Page) =>
  page.getByRole('list', { name: 'Your library' }).getByRole('heading', { level: 2 });

test('adding a search result lists it in your library, at its status', async ({ page }) => {
  await signUp(page);
  await page.goto('/catalog/books?q=dune');
  await page.getByRole('combobox', { name: `Status for ${DUNE}` }).selectOption('Done');

  await page.getByRole('button', { name: `Add ${DUNE}` }).click();

  await expect(page.getByRole('status')).toHaveText('Added to your library as Done.');
  await page.goto('/library');
  await expect(libraryHeadings(page)).toHaveText([`${DUNE} · Done`]);
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

test('changing a status in your library shows the new one and keeps the history', async ({
  page,
}) => {
  await signUp(page);
  await addDune(page, 'Want');
  await page.goto('/library');
  await page.getByRole('combobox', { name: `Status for ${DUNE}` }).selectOption('Done');

  await page.getByRole('button', { name: `Update ${DUNE}` }).click();

  await expect(libraryHeadings(page)).toHaveText([`${DUNE} · Done`]);
  await page.getByText('History').click();
  await expect(
    page.getByRole('list', { name: `History of ${DUNE}` }).getByRole('listitem'),
  ).toHaveText([/^Want · /, /^Done · /]);
});
