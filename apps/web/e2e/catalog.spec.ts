import { expect, type Page, test } from '@playwright/test';

const results = (page: Page) => page.getByRole('list', { name: 'Results' });
const titles = (page: Page) => results(page).getByRole('heading', { level: 2 });
// Under each title: who made it, and when.
const metas = (page: Page) => results(page).getByRole('paragraph');

test('searching movies by keyboard lists matching results and credits TMDB', async ({ page }) => {
  await page.goto('/catalog/movies');

  // Skip link, past the sidebar (it lists the media), and the search is the first stop.
  await page.keyboard.press('Tab');
  await page.keyboard.press('Enter');
  await page.keyboard.press('Tab');
  const search = page.getByRole('searchbox', { name: 'Search movies' });
  await expect(search).toBeFocused();

  await page.keyboard.type('matrix');
  await page.keyboard.press('Enter');

  await expect(page).toHaveURL(/\/catalog\/movies\?q=matrix$/);
  await expect(titles(page)).toHaveText(['The Matrix', 'The Matrix Reloaded']);
  await expect(metas(page)).toHaveText(['1999', '2003']);
  await expect(
    page.getByText('This product uses the TMDB API but is not endorsed or certified by TMDB.'),
  ).toBeVisible();
});

test('searching books lists only books, without crediting TMDB', async ({ page }) => {
  await page.goto('/catalog/books');
  await page.getByRole('searchbox', { name: 'Search books' }).fill('dune');

  await page.keyboard.press('Enter');

  await expect(page).toHaveURL(/\/catalog\/books\?q=dune$/);
  await expect(titles(page)).toHaveText(['Dune', 'Dune Messiah']);
  await expect(metas(page)).toHaveText(['Frank Herbert · 1965', 'Frank Herbert · 1969']);
  await expect(page.getByText('This product uses the TMDB API', { exact: false })).toHaveCount(0);
});

test('searching albums lists only albums', async ({ page }) => {
  await page.goto('/catalog/albums');
  await page.getByRole('searchbox', { name: 'Search albums' }).fill('computer');

  await page.keyboard.press('Enter');

  await expect(page).toHaveURL(/\/catalog\/albums\?q=computer$/);
  await expect(titles(page)).toHaveText(['OK Computer']);
  await expect(metas(page)).toHaveText(['Radiohead · 1997']);
});

test('switching media marks the new one and searches the same words in it', async ({ page }) => {
  await page.goto('/catalog/movies?q=dune');
  const media = page.getByRole('navigation', { name: 'Media' });

  await media.getByRole('link', { name: 'Books' }).click();

  await expect(page).toHaveURL(/\/catalog\/books\?q=dune$/);
  await expect(media.getByRole('link', { name: 'Books' })).toHaveAttribute('aria-current', 'page');
  await expect(media.getByRole('link', { name: 'Movies' })).not.toHaveAttribute('aria-current');
  await expect(titles(page)).toHaveText(['Dune', 'Dune Messiah']);
});

// The album's cover is on a host that never answers; the book has none. Neither leaves a gap or
// a broken image: a placeholder of the cover's shape stands in.
test.describe('a result whose cover is missing shows a placeholder in its place', () => {
  for (const [media, query] of [
    ['albums', 'computer'],
    ['books', 'dune'],
  ]) {
    test(`in ${media}`, async ({ page }) => {
      await page.goto(`/catalog/${media}?q=${query}`);

      const placeholders = results(page).locator('.cover-empty');

      await expect(placeholders).toHaveCount(await results(page).getByRole('listitem').count());
      await expect(results(page).locator('img')).toHaveCount(0);
    });
  }

  // A slow host fails after the page is up, not before: the placeholder still takes its place.
  test('when the cover fails late', async ({ page }) => {
    await page.route('https://covers.invalid/**', async (route) => {
      await page.waitForFunction(() => document.readyState === 'complete');
      await new Promise((resolve) => setTimeout(resolve, 500));
      await route.abort();
    });
    await page.goto('/catalog/albums?q=computer');
    await expect(results(page).locator('img')).toHaveCount(1);

    const placeholders = results(page).locator('.cover-empty');

    await expect(placeholders).toHaveCount(1);
    await expect(results(page).locator('img')).toHaveCount(0);
  });
});
