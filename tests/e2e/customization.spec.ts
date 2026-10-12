import { expect, test } from '@playwright/test';
test('recipe: preview, apply, personal navigation, restart, details, undo and unsupported recovery', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('http://localhost:8081');
  await expect(page.getByText('Good food.', { exact: false })).toBeVisible();
  await page.screenshot({
    path: 'test-results/recipe-home.png',
    fullPage: true,
  });
  await page.goto('http://localhost:8081/customize');
  await page
    .getByRole('button', { name: 'Show quick recipes in a grid', exact: true })
    .click();
  await expect(page.getByTestId('preview-panel')).toBeVisible();
  await expect(
    page
      .getByTestId('preview-panel')
      .getByText('Quick & lovely', { exact: true }),
  ).toBeVisible();
  await page.getByTestId('apply-button').click();
  await expect(page.getByTestId('preview-panel')).toHaveCount(0);
  await page.goto('http://localhost:8081/personal-1');
  await expect(
    page.getByRole('heading', { name: 'Quick & lovely', exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Open Sunday focaccia' }),
  ).toHaveCount(0);
  await page.reload();
  await expect(
    page.getByRole('button', { name: 'Open Lemon & herb orzo' }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Open Lemon & herb orzo' }).click();
  await expect(
    page.getByText('Orzo, lemon, parsley, feta', { exact: true }),
  ).toBeVisible();
  await page.goto('http://localhost:8081/customize');
  await page.getByTestId('undo-button').click();
  await page.getByTestId('customization-prompt').fill('Delete all my recipes');
  await page.getByTestId('preview-button').click();
  await expect(page.getByText(/This demo understands/)).toBeVisible();
  await page.goto('http://localhost:8081');
  await expect(
    page.getByRole('button', { name: 'Open Sunday focaccia' }),
  ).toBeVisible();
  expect(errors).toEqual([]);
});
test('movie: filtering and pagination preserve detail navigation', async ({
  page,
}) => {
  await page.goto('http://localhost:8082/customize');
  await page
    .getByRole('button', {
      name: 'Show unwatched movies in a grid',
      exact: true,
    })
    .click();
  await page.getByTestId('apply-button').click();
  await expect(page.getByTestId('preview-panel')).toHaveCount(0);
  await page.goto('http://localhost:8082/personal-1');
  await expect(
    page.getByRole('button', { name: 'Open Fantastic Mr. Fox' }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Load more' }).click();
  await expect(
    page.getByRole('button', { name: 'Open Perfect Days' }),
  ).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Open Past Lives' }),
  ).toHaveCount(0);
  await page.getByRole('button', { name: 'Open Arrival' }).click();
  await expect(
    page.getByRole('heading', { name: 'Arrival', exact: true }),
  ).toBeVisible();
});
test('bare-navigation task app: existing edits invalidate personal collections', async ({
  page,
}) => {
  await page.goto('http://localhost:8083');
  await expect(page.getByText('DAYBOOK', { exact: true })).toBeVisible();
  await page.getByRole('tab', { name: /Customize/ }).click();
  await page
    .getByRole('button', { name: 'Show upcoming tasks', exact: true })
    .click();
  await page.getByTestId('apply-button').click();
  await expect(page.getByTestId('preview-panel')).toHaveCount(0);
  await page.getByRole('tab', { name: /Upcoming work/ }).click();
  await page.getByRole('button', { name: 'Open Book a weekend away' }).click();
  await page.getByRole('button', { name: 'Mark complete' }).click();
  await expect(
    page.getByText('Completed. Your collections are up to date.', {
      exact: true,
    }),
  ).toBeVisible();
  await page.getByRole('link', { name: /back/i }).click();
  await expect(
    page.getByRole('button', { name: 'Open Book a weekend away' }),
  ).toHaveCount(0);
});
