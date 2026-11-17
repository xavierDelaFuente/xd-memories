import { expect, type Page, test } from '@playwright/test';
import { signUp } from './helpers';

const DUNE = 'Dune (1965) — Frank Herbert';
const MATRIX = 'The Matrix (1999)';

const addDune = async (page: Page, status: string) => {
  await page.goto('/catalog/books?q=dune');
  await addAs(page, DUNE, status).click();
  await expect(page.getByRole('status')).toHaveText(`Added to your library as ${status}.`);
};

const addMatrixAsDone = async (page: Page) => {
  await page.goto('/catalog/movies?q=matrix');
  await addAs(page, MATRIX, 'Done').click();
  await expect(page.getByRole('status')).toHaveText('Added to your library as Done.');
};

// Each result is added in one tap, at the status pressed.
const addAs = (page: Page, work: string, status: string) =>
  page.getByRole('group', { name: `Add ${work}` }).getByRole('button', { name: status });

const libraryTitles = (page: Page) =>
  page.getByRole('list', { name: 'Your library' }).getByRole('heading', { level: 2 });

const rowOf = (page: Page, title: string) =>
  page
    .getByRole('list', { name: 'Your library' })
    .getByRole('listitem')
    .filter({ has: page.getByRole('heading', { level: 2, name: title, exact: true }) });

// The line under the title: media · creator · year.
const metaOf = (page: Page, title: string) => rowOf(page, title).getByRole('paragraph').first();

const statusTabs = (page: Page) => page.getByRole('navigation', { name: 'Filter by status' });

const mediaChips = (page: Page) => page.getByRole('navigation', { name: 'Filter by media' });

// Editing folds away under each row; open it, unless an earlier change left it open.
const edit = async (page: Page, work: string) => {
  const summary = page.getByLabel(`Edit ${work}`);
  const open = await summary.evaluate((node) => node.parentElement?.hasAttribute('open'));
  if (!open) await summary.click();
};

const statusOf = (page: Page, work: string, status: string) =>
  page.getByRole('group', { name: `Status for ${work}` }).getByRole('button', { name: status });

const historyOf = async (page: Page, title: string, work: string) => {
  await rowOf(page, title).getByText('History', { exact: true }).click();
  return page.getByRole('list', { name: `History of ${work}` }).getByRole('listitem');
};

test('adding a search result lists it in your library, at its status', async ({ page }) => {
  await signUp(page);
  await page.goto('/catalog/books?q=dune');

  await addAs(page, DUNE, 'Done').click();

  await expect(page.getByRole('status')).toHaveText('Added to your library as Done.');
  await page.goto('/library');
  await expect(libraryTitles(page)).toHaveText(['Dune']);
  await expect(metaOf(page, 'Dune')).toHaveText('Book · Frank Herbert · 1965');
  await expect(statusTabs(page).getByRole('link', { name: 'Done 1' })).toHaveAttribute(
    'aria-current',
    'page',
  );
});

test('a search result edited in the browser is not added', async ({ page }) => {
  await signUp(page);
  await page.goto('/catalog/books?q=dune');
  await page
    .getByRole('listitem')
    .filter({ has: page.getByRole('group', { name: `Add ${DUNE}` }) })
    .locator('input[name="item"]')
    .evaluate((input: HTMLInputElement) => {
      input.value = `x${input.value}`;
    });

  await addAs(page, DUNE, 'Want').click();

  await expect(page.getByRole('main').getByRole('alert')).toHaveText(
    'This result can’t be added. Search again and retry.',
  );
  await page.goto('/library');
  await expect(page.getByText('Nothing here yet.')).toBeVisible();
});

test('signed out, search results offer no Add', async ({ page }) => {
  await page.goto('/catalog/books?q=dune');

  await expect(page.getByRole('list', { name: 'Results' })).toBeVisible();
  await expect(page.getByRole('group', { name: /^Add / })).toHaveCount(0);
});

test('changing a status in your library shows the new one and keeps the history', async ({
  page,
}) => {
  await signUp(page);
  await addDune(page, 'Want');
  await page.goto('/library');
  await edit(page, DUNE);

  await statusOf(page, DUNE, 'Done').click();

  await expect(statusTabs(page).getByRole('link', { name: 'Done 1' })).toHaveAttribute(
    'aria-current',
    'page',
  );
  await expect(statusOf(page, DUNE, 'Done')).toHaveAttribute('aria-pressed', 'true');
  await expect(await historyOf(page, 'Dune', DUNE)).toHaveText([/^Want · /, /^Done · /]);
});

// The pressed status doesn't submit: a stray tap would otherwise log it again, like a re-read.
test('pressing the current status again adds nothing to the history', async ({ page }) => {
  await signUp(page);
  await addDune(page, 'Want');
  await page.goto('/library');
  await edit(page, DUNE);

  await statusOf(page, DUNE, 'Want').click();

  await expect(await historyOf(page, 'Dune', DUNE)).toHaveText([/^Want · /]);
});

test('a dropped work can be picked up again, and the history keeps both', async ({ page }) => {
  await signUp(page);
  await addDune(page, 'Reading');
  await page.goto('/library');
  await edit(page, DUNE);
  await statusOf(page, DUNE, 'Dropped').click();
  await expect(statusTabs(page).getByRole('link', { name: 'Dropped 1' })).toHaveAttribute(
    'aria-current',
    'page',
  );
  await edit(page, DUNE);

  await statusOf(page, DUNE, 'Reading').click();

  await expect(statusTabs(page).getByRole('link', { name: 'Active 1' })).toHaveAttribute(
    'aria-current',
    'page',
  );
  await expect(await historyOf(page, 'Dune', DUNE)).toHaveText([
    /^Reading · /,
    /^Dropped · /,
    /^Reading · /,
  ]);
});

// Nothing starts out given up on: Dropped is set from the library.
test('a search result is added as want, reading or done, never dropped', async ({ page }) => {
  await signUp(page);

  await page.goto('/catalog/books?q=dune');

  await expect(page.getByRole('group', { name: `Add ${DUNE}` }).getByRole('button')).toHaveText([
    'Want',
    'Reading',
    'Done',
  ]);
});

test('rating a work in your library shows the rating, rounded', async ({ page }) => {
  await signUp(page);
  await addDune(page, 'Done');
  await page.goto('/library');
  await edit(page, DUNE);
  await page.getByRole('spinbutton', { name: `Rating for ${DUNE}` }).fill('87.5');

  await page.getByRole('button', { name: `Rate ${DUNE}` }).click();

  await expect(rowOf(page, 'Dune').getByText('88/100', { exact: true })).toBeVisible();
});

test('a series in your library records the season reached', async ({ page }) => {
  const ANIMATRIX = 'The Animatrix (2003)';
  await signUp(page);
  await page.goto('/catalog/series?q=animatrix');
  await addAs(page, ANIMATRIX, 'Watching').click();
  await expect(page.getByRole('status')).toHaveText('Added to your library as Watching.');
  await page.goto('/library');
  await edit(page, ANIMATRIX);
  await page.getByRole('spinbutton', { name: `Season reached in ${ANIMATRIX}` }).fill('1');

  await page.getByRole('button', { name: `Save season for ${ANIMATRIX}` }).click();

  await expect(metaOf(page, 'The Animatrix')).toHaveText('Series · 2003 · Season 1');
});

test('a book in your library has no season to record', async ({ page }) => {
  await signUp(page);
  await addDune(page, 'Want');

  await page.goto('/library');
  await edit(page, DUNE);

  await expect(page.getByRole('spinbutton', { name: /^Season reached in / })).toHaveCount(0);
});

// Screen 1i: the media as chips, the statuses as tabs, each counted within the media shown.
test('choosing a media counts and lists only its works', async ({ page }) => {
  await signUp(page);
  await addDune(page, 'Want');
  await addMatrixAsDone(page);
  await page.goto('/library?status=want');

  await mediaChips(page).getByRole('link', { name: 'Movies' }).click();

  await expect(page).toHaveURL(/\/library\?media=movies$/);
  await expect(mediaChips(page).getByRole('link', { name: 'Movies' })).toHaveAttribute(
    'aria-current',
    'page',
  );
  await expect(statusTabs(page).getByRole('link')).toHaveText([
    'Watching 0',
    'Want 0',
    'Done 1',
    'Dropped 0',
  ]);
  await expect(libraryTitles(page)).toHaveText(['The Matrix']);
});

test('across all media the tabs count everything, and a tab lists only its status', async ({
  page,
}) => {
  await signUp(page);
  await addDune(page, 'Want');
  await addMatrixAsDone(page);
  await page.goto('/library');

  await statusTabs(page).getByRole('link', { name: 'Want 1' }).click();

  await expect(page).toHaveURL(/\/library\?status=want$/);
  await expect(statusTabs(page).getByRole('link')).toHaveText([
    'Active 0',
    'Want 1',
    'Done 1',
    'Dropped 0',
  ]);
  await expect(libraryTitles(page)).toHaveText(['Dune']);
});
