import { expect, type Page, test } from '@playwright/test';
import { signUp } from './helpers';

const nav = (page: Page) => page.getByRole('navigation', { name: 'Main' });
const media = (page: Page) => page.getByRole('navigation', { name: 'Media' });

// How many lines the wordmark's text takes: one, unless it wraps at its hyphen.
const wordmarkLines = (page: Page) =>
  page
    .getByRole('banner')
    .getByRole('link', { name: 'xd-memories' })
    .evaluate((link) => {
      const range = document.createRange();
      range.selectNodeContents(link);
      return new Set([...range.getClientRects()].map(({ top }) => Math.round(top))).size;
    });

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

// A wide but short window: the sidebar scrolls rather than spilling into a second column.
test.describe('in a short wide window', () => {
  test.use({ viewport: { width: 1280, height: 360 } });

  test('the sidebar stays one column', async ({ page }) => {
    await page.goto('/');

    const spill = await page
      .getByRole('banner')
      .evaluate((header) => header.scrollWidth - header.clientWidth);

    expect(spill).toBe(0);
  });
});

test.describe('on a phone', () => {
  test.use({ viewport: { width: 320, height: 640 } });

  test('every link and the colour choice fit', async ({ page }) => {
    await page.goto('/');

    for (const link of await nav(page).getByRole('link').all())
      await expect(link).toBeInViewport({ ratio: 1 });
    await expect(page.getByRole('group', { name: 'Colour scheme' })).toBeInViewport({
      ratio: 1,
    });
  });

  test('the top bar is one line: the wordmark whole, the three colour buttons side by side', async ({
    page,
  }) => {
    await page.goto('/');

    const lines = await wordmarkLines(page);
    // One row: no button starts below another's bottom edge (the chosen one may sit a pixel off).
    const buttons = await page
      .getByRole('group', { name: 'Colour scheme' })
      .getByRole('button')
      .evaluateAll((all) =>
        all.map((b) => ({
          top: b.getBoundingClientRect().top,
          bottom: b.getBoundingClientRect().bottom,
        })),
      );
    const oneRow = buttons.every(({ top }) => buttons.every((other) => top < other.bottom));
    const brand = await page
      .getByRole('banner')
      .getByRole('link', { name: 'xd-memories' })
      .boundingBox();
    const besideBrand = buttons.every(
      ({ top, bottom }) => brand !== null && top < brand.y + brand.height && brand.y < bottom,
    );

    expect(lines).toBe(1);
    expect(buttons).toHaveLength(3);
    expect(oneRow).toBe(true);
    expect(besideBrand).toBe(true);
  });

  test.describe('no page scrolls sideways', () => {
    for (const path of ['/', '/catalog/movies', '/catalog/books?q=dune', '/sign-up', '/privacy']) {
      test(path, async ({ page }) => {
        await page.goto(path);

        const overflow = await page.evaluate(
          () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
        );

        expect(overflow).toBe(0);
      });
    }

    // Text enlarged a quarter, as a browser's font size setting does: the top bar may wrap, but
    // the buttons move below the wordmark rather than off the screen or into it.
    test('/ with enlarged text', async ({ page }) => {
      await page.goto('/');
      await page.evaluate(() => {
        document.documentElement.style.fontSize = '20px';
      });

      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      );

      expect(overflow).toBe(0);
      expect(await wordmarkLines(page)).toBe(1);
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
