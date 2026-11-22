import { test, expect } from '@playwright/test';

const INITIAL_CARDS = 3;
const TITLE_ERROR = 'Please type a title for the image.';
const URL_ERROR = 'Please type a valid URL';

test.beforeEach(async ({ page }) => {
  await page.route('https://images.test/**', (route) => route.abort());
  await page.goto('/vanilla-js-web-app-example/');
  await expect(page.getByRole('article')).toHaveCount(INITIAL_CARDS);
});

test.describe('form validation', () => {
  test('does not show any error before the first submit', async ({ page }) => {
    await expect(page.getByText(TITLE_ERROR)).toBeHidden();
    await expect(page.getByText(URL_ERROR)).toBeHidden();
  });

  test('shows both errors and focuses the title when the form is empty', async ({ page }) => {
    await page.getByRole('button', { name: 'Submit Form' }).click();

    await expect(page.getByText(TITLE_ERROR)).toBeVisible();
    await expect(page.getByText(URL_ERROR)).toBeVisible();
    await expect(page.getByRole('textbox', { name: 'Image Title' })).toBeFocused();
    await expect(page.getByRole('article')).toHaveCount(INITIAL_CARDS);
  });

  test('requires a title even when the URL is valid', async ({ page }) => {
    await page.getByRole('textbox', { name: 'Image URL' }).fill('https://images.test/photo.png');
    await page.getByRole('button', { name: 'Submit Form' }).click();

    await expect(page.getByText(TITLE_ERROR)).toBeVisible();
    await expect(page.getByRole('textbox', { name: 'Image Title' })).toBeFocused();
    await expect(page.getByRole('article')).toHaveCount(INITIAL_CARDS);
  });

  test('requires a URL even when the title is filled', async ({ page }) => {
    await page.getByRole('textbox', { name: 'Image Title' }).fill('Only Title');
    await page.getByRole('button', { name: 'Submit Form' }).click();

    await expect(page.getByText(URL_ERROR)).toBeVisible();
    await expect(page.getByRole('textbox', { name: 'Image URL' })).toBeFocused();
    await expect(page.getByRole('article')).toHaveCount(INITIAL_CARDS);
  });

  test('rejects an invalid URL and keeps what was typed', async ({ page }) => {
    await page.getByRole('textbox', { name: 'Image Title' }).fill('Broken URL');
    await page.getByRole('textbox', { name: 'Image URL' }).fill('not-a-url');
    await page.getByRole('button', { name: 'Submit Form' }).click();

    await expect(page.getByText(URL_ERROR)).toBeVisible();
    await expect(page.getByRole('textbox', { name: 'Image URL' })).toBeFocused();
    await expect(page.getByRole('textbox', { name: 'Image Title' })).toHaveValue('Broken URL');
    await expect(page.getByRole('textbox', { name: 'Image URL' })).toHaveValue('not-a-url');
    await expect(page.getByRole('article')).toHaveCount(INITIAL_CARDS);
  });

  test('removes the validation state after fixing the fields and submitting', async ({ page }) => {
    const form = page.locator('form');
    const submit = page.getByRole('button', { name: 'Submit Form' });

    // First an invalid submit: the form enters the validated state
    await submit.click();
    await expect(form).toHaveClass(/was-validated/);
    await expect(page.getByText(TITLE_ERROR)).toBeVisible();

    // Then a valid one: the errors go away and the card is created
    await page.getByRole('textbox', { name: 'Image Title' }).fill('Now Valid');
    await page.getByRole('textbox', { name: 'Image URL' }).fill('https://images.test/valid.png');
    await submit.click();

    await expect(page.getByRole('article')).toHaveCount(INITIAL_CARDS + 1);
    await expect(form).not.toHaveClass(/was-validated/);
    await expect(page.getByText(TITLE_ERROR)).toBeHidden();
    await expect(page.getByText(URL_ERROR)).toBeHidden();
  });
});
