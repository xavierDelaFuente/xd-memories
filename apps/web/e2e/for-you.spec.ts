import { expect, type Page, test } from '@playwright/test';
import { signUp } from './helpers';

const add = async (page: Page, search: string, work: string, status: string) => {
  await page.goto(search);
  await page
    .getByRole('group', { name: `Add ${work}` })
    .getByRole('button', { name: status })
    .click();
  await expect(page.getByRole('status')).toHaveText(`Added to your library as ${status}.`);
};

const continueList = (page: Page) => page.getByRole('list', { name: 'Continue' });

const cardOf = (page: Page, title: string) =>
  continueList(page)
    .getByRole('listitem')
    .filter({ has: page.getByRole('heading', { level: 3, name: title, exact: true }) });

test('signed in, home is For you, and Continue says when nothing is in progress', async ({
  page,
}) => {
  await signUp(page);

  await page.goto('/');

  await expect(page.getByRole('heading', { level: 1 })).toHaveText('For you');
  await expect(page.getByRole('heading', { level: 2, name: 'Continue' })).toBeVisible();
  await expect(page.getByText('Nothing in progress.')).toBeVisible();
  await expect(continueList(page)).toHaveCount(0);
});

test('Continue lists the works in progress, the latest started first', async ({ page }) => {
  await signUp(page);
  await add(page, '/catalog/books?q=dune', 'Dune (1965) — Frank Herbert', 'Reading');
  await add(page, '/catalog/books?q=dune', 'Dune Messiah (1969) — Frank Herbert', 'Want');
  await add(page, '/catalog/movies?q=matrix', 'The Matrix (1999)', 'Watching');

  await page.goto('/');

  await expect(continueList(page).getByRole('heading', { level: 3 })).toHaveText([
    'The Matrix',
    'Dune',
  ]);
  await expect(page.getByRole('heading', { level: 2, name: /^Continue/ })).toHaveText(
    'Continue 2 in progress',
  );
  await expect(cardOf(page, 'Dune').getByText(/^Reading since \d{1,2} \w{3} \d{4}$/)).toBeVisible();
});

test('a work in Continue opens on its own page', async ({ page }) => {
  await signUp(page);
  await add(page, '/catalog/books?q=dune', 'Dune (1965) — Frank Herbert', 'Reading');
  await page.goto('/');

  await cardOf(page, 'Dune').getByRole('link', { name: 'Dune', exact: true }).click();

  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Dune');
});

test('the demo’s For you continues Severance at its season', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Try the demo' }).click();
  await expect(page).toHaveURL(/\/library$/);

  await page.goto('/');

  await expect(continueList(page).getByRole('heading', { level: 3 })).toHaveText(['Severance']);
  await expect(cardOf(page, 'Severance')).toContainText('Series');
  await expect(cardOf(page, 'Severance')).toContainText('Season 2 · Watching since 15 Oct 2026');
});
