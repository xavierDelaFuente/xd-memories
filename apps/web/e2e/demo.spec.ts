import { expect, type Page, test } from '@playwright/test';

const tryTheDemo = async (page: Page) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Try the demo' }).click();
  await expect(page).toHaveURL(/\/library$/);
};

const titles = (page: Page) =>
  page.getByRole('list', { name: 'Your library' }).getByRole('heading', { level: 2 });

const statusTab = (page: Page, name: string) =>
  page.getByRole('navigation', { name: 'Filter by status' }).getByRole('link', { name });

// It opens on what's in progress; the other tabs hold the rest.
test('"Try the demo" opens a seeded library', async ({ page }) => {
  await tryTheDemo(page);

  await expect(
    page.getByRole('navigation', { name: 'Filter by status' }).getByRole('link'),
  ).toHaveText(['Active 1', 'Want 1', 'Done 2', 'Dropped 0']);
  await expect(titles(page)).toHaveText(['Severance']);
  await statusTab(page, 'Done 2').click();
  await expect(titles(page)).toHaveText(['Dune', 'OK Computer']);
});

test('the demo library says it is read-only and offers nothing to change', async ({ page }) => {
  await tryTheDemo(page);

  await expect(
    page.getByText('This is the demo library: look around, nothing can be changed.'),
  ).toBeVisible();
  await expect(
    page.getByRole('button', { name: /^(Rate|Save season|Highlight|Remove highlight) / }),
  ).toHaveCount(0);
  await expect(page.getByRole('group', { name: /^Status for / })).toHaveCount(0);
});

// One work of each media: each named in words, its dot only beside the label.
test('each work in the library shows its media', async ({ page }) => {
  await tryTheDemo(page);
  const media = page.getByRole('list', { name: 'Your library' }).locator('.media-tag');
  const shown: string[] = [];

  for (const tab of ['Active 1', 'Want 1', 'Done 2']) {
    await statusTab(page, tab).click();
    await expect(statusTab(page, tab)).toHaveAttribute('aria-current', 'page');
    shown.push(...(await media.allTextContents()));
  }

  expect(shown).toEqual(['Series', 'Movie', 'Book', 'Album']);
});

test('in the demo, search results offer no Add', async ({ page }) => {
  await tryTheDemo(page);

  await page.goto('/catalog/books?q=dune');

  await expect(page.getByRole('list', { name: 'Results' })).toBeVisible();
  await expect(page.getByRole('group', { name: /^Add / })).toHaveCount(0);
});
