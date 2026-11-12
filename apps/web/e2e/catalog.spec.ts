import { expect, test } from '@playwright/test';

test('searching movies by keyboard lists matching results and credits TMDB', async ({ page }) => {
  await page.goto('/catalog/movies');

  // Skip link, then past the header into the page: the media first, then the search.
  await page.keyboard.press('Tab');
  await page.keyboard.press('Enter');
  for (const media of ['Movies', 'Series', 'Books', 'Albums']) {
    await page.keyboard.press('Tab');
    await expect(page.getByRole('link', { name: media, exact: true })).toBeFocused();
  }
  await page.keyboard.press('Tab');
  const search = page.getByRole('searchbox', { name: 'Search movies' });
  await expect(search).toBeFocused();

  await page.keyboard.type('matrix');
  await page.keyboard.press('Enter');

  await expect(page).toHaveURL(/\/catalog\/movies\?q=matrix$/);
  await expect(page.getByRole('list', { name: 'Results' }).getByRole('listitem')).toHaveText([
    'The Matrix (1999)',
    'The Matrix Reloaded (2003)',
  ]);
  await expect(
    page.getByText('This product uses the TMDB API but is not endorsed or certified by TMDB.'),
  ).toBeVisible();
});

test('searching books lists only books, without crediting TMDB', async ({ page }) => {
  await page.goto('/catalog/books');
  await page.getByRole('searchbox', { name: 'Search books' }).fill('dune');

  await page.keyboard.press('Enter');

  await expect(page).toHaveURL(/\/catalog\/books\?q=dune$/);
  await expect(page.getByRole('list', { name: 'Results' }).getByRole('listitem')).toHaveText([
    'Dune (1965) — Frank Herbert',
    'Dune Messiah (1969) — Frank Herbert',
  ]);
  await expect(page.getByText('This product uses the TMDB API', { exact: false })).toHaveCount(0);
});

test('searching albums lists only albums', async ({ page }) => {
  await page.goto('/catalog/albums');
  await page.getByRole('searchbox', { name: 'Search albums' }).fill('computer');

  await page.keyboard.press('Enter');

  await expect(page).toHaveURL(/\/catalog\/albums\?q=computer$/);
  await expect(page.getByRole('list', { name: 'Results' }).getByRole('listitem')).toHaveText([
    'OK Computer (1997) — Radiohead',
  ]);
});

test('switching media marks the new one and searches the same words in it', async ({ page }) => {
  await page.goto('/catalog/movies?q=dune');
  const media = page.getByRole('navigation', { name: 'Media' });

  await media.getByRole('link', { name: 'Books' }).click();

  await expect(page).toHaveURL(/\/catalog\/books\?q=dune$/);
  await expect(media.getByRole('link', { name: 'Books' })).toHaveAttribute('aria-current', 'page');
  await expect(media.getByRole('link', { name: 'Movies' })).not.toHaveAttribute('aria-current');
  await expect(page.getByRole('list', { name: 'Results' }).getByRole('listitem')).toHaveText([
    'Dune (1965) — Frank Herbert',
    'Dune Messiah (1969) — Frank Herbert',
  ]);
});
