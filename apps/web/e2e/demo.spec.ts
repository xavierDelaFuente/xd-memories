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

test('the demo library says it is read-only', async ({ page }) => {
  await tryTheDemo(page);

  await expect(
    page.getByText('This is the demo library: look around, nothing can be changed.'),
  ).toBeVisible();
});

// Severance is in progress: a season reached, a status, a rating could all be changed, if it weren't
// the demo. It shows them, and offers nothing to change.
test('a demo work’s page shows what was done with it, and offers nothing to change', async ({
  page,
}) => {
  await tryTheDemo(page);

  await page.getByRole('link', { name: 'Severance', exact: true }).click();

  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Severance');
  await expect(page.getByText(/^Started \d{1,2} [A-Z][a-z]{2} \d{4}$/)).toBeVisible();
  await expect(
    page.getByRole('button', { name: /^(Rate|Save season|Highlight|Remove highlight) / }),
  ).toHaveCount(0);
  await expect(page.getByRole('group', { name: /^Status for / })).toHaveCount(0);
  await expect(page.getByRole('spinbutton')).toHaveCount(0);
});

// Each source named and linked to the work's page there; TMDB credited where its data is shown.
test('a demo work’s page links to its sources', async ({ page }) => {
  await tryTheDemo(page);

  await page.getByRole('link', { name: 'Severance', exact: true }).click();

  await expect(
    page.getByRole('list', { name: 'Sources' }).getByRole('link', { name: 'TMDB' }),
  ).toHaveAttribute('href', 'https://www.themoviedb.org/tv/95396');
  await expect(
    page.getByText('This product uses the TMDB API but is not endorsed or certified by TMDB.'),
  ).toBeVisible();
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
