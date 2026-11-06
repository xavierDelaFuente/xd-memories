import { expect, type Page, test } from '@playwright/test';

const html = (page: Page) => page.locator('html');
const choose = (page: Page, mode: string) =>
  page.getByRole('group', { name: 'Colour scheme' }).getByRole('button', { name: mode });

test('by default the colours follow the system', async ({ page }) => {
  await page.goto('/');

  await expect(html(page)).not.toHaveAttribute('data-mode');
  await expect(choose(page, 'System')).toHaveAttribute('aria-pressed', 'true');
});

test('dark, once chosen, stays on every page and visit', async ({ page }) => {
  await page.goto('/');
  await choose(page, 'Dark').click();
  await expect(choose(page, 'Dark')).toHaveAttribute('aria-pressed', 'true');

  await page.goto('/sign-in');

  await expect(html(page)).toHaveAttribute('data-mode', 'dark');
  await expect(choose(page, 'Light')).toHaveAttribute('aria-pressed', 'false');
});

test('choosing system again drops the choice', async ({ page }) => {
  await page.goto('/');
  await choose(page, 'Light').click();
  await expect(html(page)).toHaveAttribute('data-mode', 'light');

  await choose(page, 'System').click();

  await expect(html(page)).not.toHaveAttribute('data-mode');
});

test.describe('before JavaScript loads', () => {
  test.use({ javaScriptEnabled: false });

  test('the choice still works', async ({ page }) => {
    await page.goto('/');

    await choose(page, 'Dark').click();

    await expect(html(page)).toHaveAttribute('data-mode', 'dark');
  });
});
