// @vitest-environment jsdom
import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { afterEach, expect, it } from 'vitest';
import { installProject, overridesSchema } from '@customitin/cli';
import { consumer } from './helpers/consumer';
import { screenConsumer } from './helpers/screen-consumer';
import { loadScreenConsumer } from './helpers/load-screen';

afterEach(cleanup);
it('shows newly edited host UI while registration is stale and customizes it after refresh', async () => {
  const root = await consumer(screenConsumer);
  await installProject(root, {
    dryRun: false,
    overrides: overridesSchema.parse({
      version: 1,
      screens: { 'Home.tsx#Home': { enabled: true } },
    }),
  });
  const path = join(root, 'Home.tsx');
  const edited =
    `import {Text as NewText} from 'react-native';\n${await readFile(path, 'utf8')}`
      .replace(
        '<Pressable',
        '<NewText key="summary">New summary</NewText><Pressable',
      )
      .replace('setCount(count + 1)', 'setCount(count + 2)');
  await writeFile(path, edited);
  const { default: BeforeRefresh } = loadScreenConsumer(root);
  render(<BeforeRefresh />);
  expect(await screen.findByText('New summary')).toBeTruthy();
  expect(
    screen.queryByRole('button', { name: 'Customize this screen' }),
  ).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: 'Existing action 0' }));
  expect(
    screen.getByRole('button', { name: 'Existing action 2' }),
  ).toBeTruthy();
  cleanup();
  const result = await installProject(root, { dryRun: false });
  expect(result.issues).toEqual([]);
  expect(result.conflicts).toEqual([]);
  const { default: Refreshed } = loadScreenConsumer(root);
  render(<Refreshed />);
  const customize = await screen.findByRole('button', {
    name: 'Customize this screen',
  });
  await waitFor(() =>
    expect(customize.getAttribute('aria-disabled')).not.toBe('true'),
  );
  fireEvent.click(customize);
  fireEvent.click(screen.getByRole('button', { name: 'Hide summary' }));
  const section = screen
    .getByText('New summary')
    .closest('[data-testid^="screen-section-"]')!;
  expect(window.getComputedStyle(section).display).toBe('none');
  fireEvent.click(screen.getByRole('button', { name: 'Show summary' }));
  expect(window.getComputedStyle(section).display).not.toBe('none');
});
