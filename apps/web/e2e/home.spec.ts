import { expect, type Locator, type Page, test } from '@playwright/test';

test('home page renders the app name and skips to content by keyboard', async ({ page }) => {
  await page.goto('/');

  await expect(page.getByRole('heading', { level: 1, name: 'xd-memories' })).toBeVisible();

  await page.keyboard.press('Tab');
  const skipLink = page.getByRole('link', { name: 'Skip to content' });
  await expect(skipLink).toBeFocused();

  await page.keyboard.press('Enter');
  await expect(page.getByRole('main')).toBeFocused();
});

// The font Chromium actually drew the element's text in: not the CSS stack, which names a font
// whether or not it loaded.
const renderedFont = async (page: Page, element: Locator): Promise<string[]> => {
  await page.evaluate(() => document.fonts.ready);
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('DOM.enable');
  await cdp.send('CSS.enable');
  const { root } = await cdp.send('DOM.getDocument');
  const selector = await element.evaluate((node) => {
    node.setAttribute('data-font-probe', '');
    return '[data-font-probe]';
  });
  const { nodeId } = await cdp.send('DOM.querySelector', { nodeId: root.nodeId, selector });
  const { fonts } = await cdp.send('CSS.getPlatformFontsForNode', { nodeId });
  return fonts.map(({ familyName }) => familyName);
};

test('page titles are in Newsreader', async ({ page }) => {
  await page.goto('/');

  const fonts = await renderedFont(page, page.getByRole('heading', { level: 1 }));

  // The variable font names its instance, e.g. 'Newsreader 16pt'.
  expect(fonts).toEqual([expect.stringMatching(/^Newsreader/)]);
});

test('text is in Geist', async ({ page }) => {
  await page.goto('/');

  const fonts = await renderedFont(page, page.getByRole('main').getByRole('paragraph').first());

  expect(fonts).toEqual(['Geist']);
});

// Self-hosted: no font CDN sees who opens the app, and a slow one can't hold up the text.
test('fonts are served by the app itself', async ({ page, baseURL }) => {
  const fontRequests: string[] = [];
  page.on('request', (request) => {
    if (request.resourceType() === 'font') fontRequests.push(request.url());
  });

  await page.goto('/');
  await page.evaluate(() => document.fonts.ready);

  expect(fontRequests).not.toEqual([]);
  expect(fontRequests.filter((url) => !url.startsWith(`${baseURL}/`))).toEqual([]);
});
