import { expect, test } from '@playwright/test';
import { signUp } from './helpers';

const DUNE = 'Dune (1965) — Frank Herbert';

test('a highlight is visible to another signed-in user, without the rest of the library', async ({
  page,
}) => {
  await signUp(page);
  await page.goto('/catalog/books?q=dune');
  await page
    .getByRole('group', { name: `Add ${DUNE}` })
    .getByRole('button', { name: 'Done' })
    .click();
  await expect(page.getByRole('status')).toHaveText('Added to your library as Done.');
  await page.goto('/library');
  await page.getByRole('spinbutton', { name: `Rating for ${DUNE}` }).fill('90');
  await page.getByRole('button', { name: `Rate ${DUNE}` }).click();
  await page.getByRole('button', { name: `Highlight ${DUNE}` }).click();
  await expect(page.getByRole('button', { name: `Remove highlight from ${DUNE}` })).toBeVisible();
  await page.getByRole('link', { name: 'Your highlights' }).click();
  await expect(page.getByRole('heading', { name: 'Your highlights' })).toBeVisible();
  const profile = page.url();
  await page.context().clearCookies();
  await signUp(page);

  await page.goto(profile);

  await expect(
    page.getByRole('list', { name: 'Highlights' }).getByRole('heading', { level: 2 }),
  ).toHaveText([DUNE]);
});

test('signed out, a profile sends you to sign in', async ({ page }) => {
  await page.goto('/people/anyone');

  await expect(page).toHaveURL(/\/sign-in$/);
});
