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

// A work is changed on its own page (screen 1c), reached from its row in the library.
const openWork = async (page: Page, title: string) => {
  await page.goto('/library');
  await rowOf(page, title).getByRole('link', { name: title, exact: true }).click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(title);
};

const statusOf = (page: Page, work: string, status: string) =>
  page.getByRole('group', { name: `Status for ${work}` }).getByRole('button', { name: status });

const historyOf = (page: Page, work: string) =>
  page.getByRole('list', { name: `History of ${work}` }).getByRole('listitem');

test('a search result already in your library shows its status and links to its page, in place of Add', async ({
  page,
}) => {
  await signUp(page);
  await addDune(page, 'Reading');

  await page.goto('/catalog/books?q=dune');

  const dune = page
    .getByRole('list', { name: 'Results' })
    .getByRole('listitem')
    .filter({ has: page.getByRole('heading', { level: 2, name: 'Dune', exact: true }) });
  await expect(dune.getByText('In your library · Reading')).toBeVisible();
  await expect(page.getByRole('group', { name: `Add ${DUNE}` })).toHaveCount(0);
  await expect(page.getByRole('group', { name: /^Add Dune Messiah/ })).toBeVisible();
  await dune.getByRole('link', { name: 'Dune', exact: true }).click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Dune');
});

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

// Screen 1c: the work, where it came from, and what you've done with it.
test('a work in your library opens on its own page from its row', async ({ page }) => {
  await signUp(page);
  await addDune(page, 'Want');

  await openWork(page, 'Dune');

  await expect(page).toHaveURL(/\/works\/[^/]+$/);
  await expect(page.getByRole('main').getByText('Book · 1965', { exact: true })).toBeVisible();
  await expect(page.getByText('by Frank Herbert', { exact: true })).toBeVisible();
  await expect(page.getByText(/^Added \d{1,2} [A-Z][a-z]{2} \d{4}$/)).toBeVisible();
  await expect(page.getByRole('list', { name: 'Sources' }).getByRole('listitem')).toHaveText([
    'fixture',
  ]);
  await expect(statusOf(page, DUNE, 'Want')).toHaveAttribute('aria-pressed', 'true');
});

test('the library lists works to open, with nothing to change in place', async ({ page }) => {
  await signUp(page);
  await addDune(page, 'Want');

  await page.goto('/library');

  await expect(rowOf(page, 'Dune').getByRole('link', { name: 'Dune' })).toBeVisible();
  await expect(page.getByRole('group', { name: /^Status for / })).toHaveCount(0);
  await expect(page.getByRole('button', { name: /^(Rate|Highlight) / })).toHaveCount(0);
});

test('a work that isn’t in your library is not found', async ({ page }) => {
  await signUp(page);

  await page.goto('/works/not-a-work');

  await expect(page.getByText('This page could not be found.')).toBeVisible();
});

test('signed out, a work’s page sends you to sign in', async ({ page }) => {
  await page.goto('/works/any-work');

  await expect(page).toHaveURL(/\/sign-in$/);
});

test('changing a status on a work’s page shows the new one and keeps the history', async ({
  page,
}) => {
  await signUp(page);
  await addDune(page, 'Want');
  await openWork(page, 'Dune');

  await statusOf(page, DUNE, 'Done').click();

  await expect(statusOf(page, DUNE, 'Done')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByText(/^Finished \d{1,2} [A-Z][a-z]{2} \d{4}$/)).toBeVisible();
  await expect(historyOf(page, DUNE)).toHaveText([/^Want · /, /^Done · /]);
  await page.goto('/library');
  await expect(statusTabs(page).getByRole('link', { name: 'Done 1' })).toHaveAttribute(
    'aria-current',
    'page',
  );
});

// The pressed status doesn't submit: a stray tap would otherwise log it again, like a re-read.
test('pressing the current status again adds nothing to the history', async ({ page }) => {
  await signUp(page);
  await addDune(page, 'Want');
  await openWork(page, 'Dune');

  await statusOf(page, DUNE, 'Want').click();

  await expect(historyOf(page, DUNE)).toHaveText([/^Want · /]);
});

test('a dropped work can be picked up again, and the history keeps both', async ({ page }) => {
  await signUp(page);
  await addDune(page, 'Reading');
  await openWork(page, 'Dune');
  await statusOf(page, DUNE, 'Dropped').click();
  await expect(statusOf(page, DUNE, 'Dropped')).toHaveAttribute('aria-pressed', 'true');

  await statusOf(page, DUNE, 'Reading').click();

  await expect(statusOf(page, DUNE, 'Reading')).toHaveAttribute('aria-pressed', 'true');
  await expect(historyOf(page, DUNE)).toHaveText([/^Reading · /, /^Dropped · /, /^Reading · /]);
});

// A done after an earlier done is a re-read: its page counts the goes, its row the finishes.
test('reading a finished book again is its 2nd read, and finishing it reads "read 2×"', async ({
  page,
}) => {
  await signUp(page);
  await addDune(page, 'Done');
  await openWork(page, 'Dune');

  await statusOf(page, DUNE, 'Reading').click();

  await expect(statusOf(page, DUNE, 'Reading')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByRole('main').getByText('2nd read', { exact: true })).toBeVisible();
  await statusOf(page, DUNE, 'Done').click();
  await expect(statusOf(page, DUNE, 'Done')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByRole('main').getByText('2nd read', { exact: true })).toBeVisible();
  await page.goto('/library');
  await expect(rowOf(page, 'Dune').getByText('read 2×', { exact: true })).toBeVisible();
});

test('a first read says neither', async ({ page }) => {
  await signUp(page);
  await addDune(page, 'Done');

  await openWork(page, 'Dune');

  await expect(page.getByRole('main').getByText(/\d(st|nd|rd|th) read/)).toHaveCount(0);
  await page.goto('/library');
  await expect(rowOf(page, 'Dune').getByText(/read \d+×/)).toHaveCount(0);
});

test('a movie seen twice is its 2nd watch, and reads "watched 2×"', async ({ page }) => {
  await signUp(page);
  await addMatrixAsDone(page);
  await openWork(page, 'The Matrix');

  await statusOf(page, MATRIX, 'Watching').click();
  await expect(statusOf(page, MATRIX, 'Watching')).toHaveAttribute('aria-pressed', 'true');
  await statusOf(page, MATRIX, 'Done').click();

  await expect(statusOf(page, MATRIX, 'Done')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByRole('main').getByText('2nd watch', { exact: true })).toBeVisible();
  await page.goto('/library');
  await expect(rowOf(page, 'The Matrix').getByText('watched 2×', { exact: true })).toBeVisible();
});

// Nothing starts out given up on: Dropped is set from the work's page.
test('a search result is added as want, reading or done, never dropped', async ({ page }) => {
  await signUp(page);

  await page.goto('/catalog/books?q=dune');

  await expect(page.getByRole('group', { name: `Add ${DUNE}` }).getByRole('button')).toHaveText([
    'Want',
    'Reading',
    'Done',
  ]);
});

test('rating a work shows the rating, rounded, there and in the library', async ({ page }) => {
  await signUp(page);
  await addDune(page, 'Done');
  await openWork(page, 'Dune');
  await page.getByRole('spinbutton', { name: `Rating for ${DUNE}` }).fill('87.5');

  await page.getByRole('button', { name: `Rate ${DUNE}` }).click();

  await expect(page.getByRole('main').getByText('88/100', { exact: true })).toBeVisible();
  await page.goto('/library');
  await expect(rowOf(page, 'Dune').getByText('88/100', { exact: true })).toBeVisible();
});

test('a series records the season reached', async ({ page }) => {
  const ANIMATRIX = 'The Animatrix (2003)';
  await signUp(page);
  await page.goto('/catalog/series?q=animatrix');
  await addAs(page, ANIMATRIX, 'Watching').click();
  await expect(page.getByRole('status')).toHaveText('Added to your library as Watching.');
  await openWork(page, 'The Animatrix');
  await page.getByRole('spinbutton', { name: `Season reached in ${ANIMATRIX}` }).fill('1');

  await page.getByRole('button', { name: `Save season for ${ANIMATRIX}` }).click();

  await expect(page.getByRole('main').getByText('Series · 2003 · Season 1')).toBeVisible();
  await page.goto('/library');
  await expect(metaOf(page, 'The Animatrix')).toHaveText('Series · 2003 · Season 1');
});

test('a book has no season to record', async ({ page }) => {
  await signUp(page);
  await addDune(page, 'Want');

  await openWork(page, 'Dune');

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
