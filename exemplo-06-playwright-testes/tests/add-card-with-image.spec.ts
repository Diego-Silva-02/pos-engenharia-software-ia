import { test, expect } from '@playwright/test';

// Scenario: add a card with a custom image and see it appear in the list.
//
// The image is a small SVG generated here and sent as a "data:" URL, so the test
// does not depend on any external image host and works offline.
//
// Run it normally:        npm test
// Watch it in the browser: npm run demo

const TITLE = 'Claude Sunset';
const WIDTH = 600;
const HEIGHT = 300;

const svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}">
  <defs>
    <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#ff7e5f"/>
      <stop offset="1" stop-color="#feb47b"/>
    </linearGradient>
  </defs>
  <rect width="${WIDTH}" height="${HEIGHT}" fill="url(#sky)"/>
  <circle cx="${WIDTH / 2}" cy="230" r="70" fill="#ffe066"/>
  <text x="${WIDTH / 2}" y="60" font-size="36" text-anchor="middle" fill="white" font-family="sans-serif">Hello from Playwright</text>
</svg>`;

const imageUrl = `data:image/svg+xml;utf8,${encodeURIComponent(svg.trim())}`;

test('adds a card with a custom image and shows it in the list', async ({ page }) => {
  await page.goto('/vanilla-js-web-app-example/');
  await expect(page.getByRole('article')).toHaveCount(3);

  await page.getByRole('textbox', { name: 'Image Title' }).fill(TITLE);
  await page.getByRole('textbox', { name: 'Image URL' }).fill(imageUrl);
  await page.getByRole('button', { name: 'Submit Form' }).click();

  // The new card is added at the end of the list
  await expect(page.getByRole('article')).toHaveCount(4);
  const newCard = page.getByRole('article').last();
  await expect(newCard.getByRole('heading', { name: TITLE })).toBeVisible();

  // The image was really loaded by the browser (not a broken image)
  const image = newCard.getByRole('img', { name: `Image of an ${TITLE}` });
  await expect(image).toHaveAttribute('src', /^data:image\/svg\+xml/);
  await expect(image).toHaveJSProperty('naturalWidth', WIDTH);
  await expect(image).toHaveJSProperty('naturalHeight', HEIGHT);

  // Scroll to the card so it is visible, and keep a screenshot in the HTML report
  await newCard.scrollIntoViewIfNeeded();
  await expect(newCard).toBeInViewport();
  await test.info().attach('new-card', {
    body: await newCard.screenshot(),
    contentType: 'image/png',
  });

  // In demo mode (npm run demo) keep the browser open a bit so you can see the result
  if (process.env.DEMO) {
    await page.waitForTimeout(4_000);
  }
});
