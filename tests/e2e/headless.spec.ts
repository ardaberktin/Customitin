import { expect, test } from '@playwright/test';

test('Vite host controls: cross-source chart/table, preview cancellation, persistence, undo and confirmed actions', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('http://127.0.0.1:8084');
  const surface = page.getByRole('region', { name: 'Personal surface' });
  await expect(
    surface.getByText(
      'The host leaves this space empty until you apply a layout.',
    ),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Prepare change' }).click();
  const preview = page.getByRole('region', { name: 'Layout preview' });
  await expect(
    preview.getByRole('heading', { name: 'Team hours' }),
  ).toBeVisible();
  await expect(preview.getByText('8', { exact: true })).toBeVisible();
  await expect(
    surface.getByRole('heading', { name: 'Team hours' }),
  ).toHaveCount(0);
  await page.getByRole('button', { name: 'Discard preview' }).click();
  await expect(preview).toHaveCount(0);
  await page.getByLabel('Instruction').fill('Show targets as a table');
  await page.getByRole('button', { name: 'Prepare change' }).click();
  await expect(
    preview.getByRole('cell', { name: '24', exact: true }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Apply layout' }).click();
  await expect(preview).toHaveCount(0);
  await page.reload();
  await expect(
    surface.getByRole('cell', { name: '24', exact: true }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Undo layout' }).click();
  await expect(surface.getByRole('table')).toHaveCount(0);
  await page.getByLabel('Instruction').fill('Complete activity one');
  await page.getByRole('button', { name: 'Prepare change' }).click();
  await expect(
    page.getByRole('region', { name: 'Action confirmation' }),
  ).toBeVisible();
  await expect(
    page.getByText('Action completed.', { exact: true }),
  ).toHaveCount(0);
  await page.getByRole('button', { name: 'Confirm action' }).click();
  await expect(
    page.getByText('Action completed.', { exact: true }),
  ).toBeVisible();
  expect(errors).toEqual([]);
});

test('native example uses its own controls with the shared data and action contracts', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('http://localhost:8083');
  await page.getByRole('tab', { name: 'Workspace' }).click();
  await page.getByRole('button', { name: 'Prepare change' }).click();
  await expect(page.getByText('Design · 8', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Apply layout' }).click();
  await expect(page.getByRole('button', { name: 'Apply layout' })).toHaveCount(
    0,
  );
  await page.reload();
  await page.getByRole('tab', { name: 'Workspace' }).click();
  await expect(page.getByText('Design · 8', { exact: true })).toBeVisible();
  await page.getByLabel('Instruction').fill('Complete activity one');
  await page.getByRole('button', { name: 'Prepare change' }).click();
  await page.getByRole('button', { name: 'Confirm action' }).click();
  await expect(
    page.getByText('Action completed.', { exact: true }),
  ).toBeVisible();
  expect(errors).toEqual([]);
});
