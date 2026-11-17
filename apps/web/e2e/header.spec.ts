import { expect, type Page, test } from '@playwright/test';
import { signUp } from './helpers';

const nav = (page: Page) => page.getByRole('navigation', { name: 'Main' });
const media = (page: Page) => page.getByRole('navigation', { name: 'Media' });

// The default viewport is wide: the header is the sidebar, and its media list stands in for Browse.
test('signed out, the header offers the catalog and signing in', async ({ page }) => {
  await page.goto('/');

  await expect(nav(page).getByRole('link')).toHaveText(['Sign in']);
  await expect(media(page).getByRole('link')).toHaveText(['Movies', 'Series', 'Books', 'Music']);
  await expect(page.getByRole('banner').getByRole('link', { name: 'xd-memories' })).toHaveAttribute(
    'href',
    '/',
  );
});

test('the current section is marked', async ({ page }) => {
  await page.goto('/catalog/books');

  await expect(media(page).getByRole('link', { name: 'Books' })).toHaveAttribute(
    'aria-current',
    'page',
  );
  await expect(media(page).getByRole('link', { name: 'Movies' })).not.toHaveAttribute(
    'aria-current',
  );
  await expect(nav(page).getByRole('link', { name: 'Sign in' })).not.toHaveAttribute(
    'aria-current',
  );
});

test('signed in, the header leads to your library instead of signing in', async ({ page }) => {
  await signUp(page);

  await expect(nav(page).getByRole('link')).toHaveText(['For you', 'Library']);
  await expect(nav(page).getByRole('link', { name: 'Library' })).toHaveAttribute(
    'aria-current',
    'page',
  );
});

test.describe('on a phone', () => {
  test.use({ viewport: { width: 320, height: 640 } });

  test('every link and the colour choice fit, with no sideways scroll', async ({ page }) => {
    await page.goto('/');

    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );

    expect(overflow).toBe(0);
    for (const link of await nav(page).getByRole('link').all())
      await expect(link).toBeInViewport({ ratio: 1 });
    await expect(page.getByRole('group', { name: 'Colour scheme' })).toBeInViewport({
      ratio: 1,
    });
  });

  test('the sections are a tab bar along the bottom, each an easy tap', async ({ page }) => {
    await page.goto('/catalog/movies');

    const bar = await nav(page).boundingBox();

    await expect(nav(page).getByRole('link')).toHaveText(['Browse', 'Sign in']);
    await expect(nav(page).getByRole('link', { name: 'Browse' })).toHaveAttribute(
      'aria-current',
      'page',
    );
    expect(bar && bar.y + bar.height).toBe(640);
    for (const link of await nav(page).getByRole('link').all())
      expect((await link.boundingBox())?.height).toBeGreaterThanOrEqual(48);
  });

  test('the catalog offers the media as chips, the search kept', async ({ page }) => {
    await page.goto('/catalog/movies?q=dune');

    await media(page).getByRole('link', { name: 'Books' }).click();

    await expect(page).toHaveURL(/\/catalog\/books\?q=dune$/);
    await expect(media(page).getByRole('link')).toHaveText(['Movies', 'Series', 'Books', 'Music']);
    await expect(media(page).getByRole('link', { name: 'Books' })).toHaveAttribute(
      'aria-current',
      'page',
    );
  });
});
