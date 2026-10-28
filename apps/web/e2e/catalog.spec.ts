import { expect, test } from '@playwright/test';

test('searching movies by keyboard lists matching results and credits TMDB', async ({ page }) => {
  await page.goto('/catalog/movies');

  await page.keyboard.press('Tab');
  await page.keyboard.press('Tab');
  const search = page.getByRole('searchbox', { name: 'Search movies' });
  await expect(search).toBeFocused();

  await page.keyboard.type('matrix');
  await page.keyboard.press('Enter');

  await expect(page).toHaveURL(/\/catalog\/movies\?q=matrix$/);
  await expect(page.getByRole('list', { name: 'Results' }).getByRole('listitem')).toHaveText([
    'The Matrix',
    'The Matrix Reloaded',
  ]);
  await expect(
    page.getByText('This product uses the TMDB API but is not endorsed or certified by TMDB.'),
  ).toBeVisible();
});
