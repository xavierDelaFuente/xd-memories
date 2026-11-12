import { expect, test } from '@playwright/test';

const tryTheDemo = async (page: import('@playwright/test').Page) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Try the demo' }).click();
  await expect(page).toHaveURL(/\/library$/);
};

test('"Try the demo" opens a seeded library', async ({ page }) => {
  await tryTheDemo(page);

  await expect(
    page.getByRole('list', { name: 'Your library' }).getByRole('heading', { level: 2 }),
  ).toHaveText([
    'Severance (2022) · In progress · Season 2 · 90/100',
    'Dune (1965) — Frank Herbert · Done · 92/100',
    'OK Computer (1997) — Radiohead · Done · 95/100',
    'The Matrix (1999) · Want',
  ]);
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

test('in the demo, search results offer no Add', async ({ page }) => {
  await tryTheDemo(page);

  await page.goto('/catalog/books?q=dune');

  await expect(page.getByRole('list', { name: 'Results' })).toBeVisible();
  await expect(page.getByRole('button', { name: /^Add / })).toHaveCount(0);
});
