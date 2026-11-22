import { test, expect } from '@playwright/test';

// Each test runs in a fresh browser context, so localStorage starts empty
// and the tests do not depend on any pre-existing state.

const INITIAL_CARDS = 3;

test.beforeEach(async ({ page }) => {
  // The images are not important for these tests: do not hit external hosts
  await page.route('https://images.test/**', (route) => route.abort());
  await page.goto('/vanilla-js-web-app-example/');
  await expect(page.getByRole('article')).toHaveCount(INITIAL_CARDS);
});

test.describe('submitting the form', () => {
  test('adds a new card to the list', async ({ page }) => {
    const title = 'My Test Image';
    const imageUrl = 'https://images.test/photo.png';

    await page.getByRole('textbox', { name: 'Image Title' }).fill(title);
    await page.getByRole('textbox', { name: 'Image URL' }).fill(imageUrl);
    await page.getByRole('button', { name: 'Submit Form' }).click();

    await expect(page.getByRole('article')).toHaveCount(INITIAL_CARDS + 1);
    await expect(page.getByRole('heading', { name: title })).toBeVisible();
    await expect(page.getByRole('img', { name: `Image of an ${title}` })).toHaveAttribute('src', imageUrl);
  });

  test('keeps the existing cards and appends the new one at the end', async ({ page }) => {
    await page.getByRole('textbox', { name: 'Image Title' }).fill('Last Card');
    await page.getByRole('textbox', { name: 'Image URL' }).fill('https://images.test/last.png');
    await page.getByRole('button', { name: 'Submit Form' }).click();

    await expect(page.getByRole('heading')).toHaveText([
      'AI Alien',
      'Predator Night Vision',
      'ET Bilu',
      'Last Card',
    ]);
  });

  test('clears the form and moves the focus back to the title after a valid submit', async ({ page }) => {
    const titleInput = page.getByRole('textbox', { name: 'Image Title' });
    const urlInput = page.getByRole('textbox', { name: 'Image URL' });

    await titleInput.fill('Reset Me');
    await urlInput.fill('https://images.test/reset.png');
    await page.getByRole('button', { name: 'Submit Form' }).click();

    await expect(page.getByRole('article')).toHaveCount(INITIAL_CARDS + 1);
    await expect(titleInput).toHaveValue('');
    await expect(urlInput).toHaveValue('');
    await expect(titleInput).toBeFocused();
  });

  test('keeps the new card after reloading the page', async ({ page }) => {
    const title = 'Saved Image';

    await page.getByRole('textbox', { name: 'Image Title' }).fill(title);
    await page.getByRole('textbox', { name: 'Image URL' }).fill('https://images.test/saved.png');
    await page.getByRole('button', { name: 'Submit Form' }).click();
    await expect(page.getByRole('heading', { name: title })).toBeVisible();

    await page.reload();

    await expect(page.getByRole('article')).toHaveCount(INITIAL_CARDS + 1);
    await expect(page.getByRole('heading', { name: title })).toBeVisible();
  });

  test('adds one card for each submit', async ({ page }) => {
    for (const title of ['First', 'Second']) {
      await page.getByRole('textbox', { name: 'Image Title' }).fill(title);
      await page.getByRole('textbox', { name: 'Image URL' }).fill(`https://images.test/${title}.png`);
      await page.getByRole('button', { name: 'Submit Form' }).click();
      await expect(page.getByRole('heading', { name: title })).toBeVisible();
    }

    await expect(page.getByRole('article')).toHaveCount(INITIAL_CARDS + 2);
  });
});
