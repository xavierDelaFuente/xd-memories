import { expect, type Page, test } from '@playwright/test';
import { signUp } from './helpers';

const nav = (page: Page) => page.getByRole('navigation', { name: 'Main' });

test('signed out, the header offers the catalog and signing in', async ({ page }) => {
  await page.goto('/');

  await expect(nav(page).getByRole('link')).toHaveText(['Catalog', 'Sign in']);
  await expect(page.getByRole('banner').getByRole('link', { name: 'xd-memories' })).toHaveAttribute(
    'href',
    '/',
  );
});

test('the current section is marked', async ({ page }) => {
  await page.goto('/catalog/books');

  await expect(nav(page).getByRole('link', { name: 'Catalog' })).toHaveAttribute(
    'aria-current',
    'page',
  );
  await expect(nav(page).getByRole('link', { name: 'Sign in' })).not.toHaveAttribute(
    'aria-current',
  );
});

test('signed in, the header leads to your library instead of signing in', async ({ page }) => {
  await signUp(page);

  await expect(nav(page).getByRole('link')).toHaveText(['Catalog', 'Library']);
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
});
