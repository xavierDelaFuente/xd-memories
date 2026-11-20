import { expect, test } from '@playwright/test';
import { signUp } from './helpers';

test('the privacy note says what is stored, who sees it, who handles it, and how to delete it', async ({
  page,
}) => {
  await page.goto('/privacy');

  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Privacy');
  await expect(page.getByRole('heading', { level: 2 })).toHaveText([
    'What is stored',
    'Who sees what',
    'Who else handles it',
    'Deleting your account',
  ]);
  await expect(page.getByRole('main').getByRole('link', { name: 'Account' })).toHaveAttribute(
    'href',
    '/account',
  );
});

test('signing up links to the privacy note before the button', async ({ page }) => {
  await page.goto('/sign-up');

  const link = page.getByRole('main').getByRole('link', { name: 'privacy note' });
  const button = page.getByRole('button', { name: 'Create account' });
  const linkFirst = await link.evaluate(
    (node, other) =>
      Boolean(node.compareDocumentPosition(other) & Node.DOCUMENT_POSITION_FOLLOWING),
    await button.elementHandle(),
  );

  expect(linkFirst).toBe(true);
  await expect(link).toHaveAttribute('href', '/privacy');
});

test.describe('every page links to the privacy note', () => {
  test('signed out', async ({ page }) => {
    await page.goto('/');

    await page.getByRole('contentinfo').getByRole('link', { name: 'Privacy' }).click();

    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Privacy');
  });

  test('signed in', async ({ page }) => {
    await signUp(page);

    await page.getByRole('contentinfo').getByRole('link', { name: 'Privacy' }).click();

    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Privacy');
  });
});
