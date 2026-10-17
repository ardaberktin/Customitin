// @vitest-environment jsdom
import { afterEach, expect, it } from 'vitest';
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { CustomizationProvider } from '../packages/react-native/src/provider/context';
import { PersonalizationScreen } from '../examples/shared/src/ui/composer/composer';
import { memoryStorage } from '../packages/react-native/src/storage/profile-store';
import { registries } from '../examples/shared/src/registry';
afterEach(cleanup);
it('requires a preview before applying and supports undo without a planner', async () => {
  const storage = memoryStorage();
  render(
    <CustomizationProvider
      options={{ registry: registries.recipe, storage, scope: 'ui-test' }}
      bindings={{ sources: {} }}
    >
      <PersonalizationScreen />
    </CustomizationProvider>,
  );
  await waitFor(() =>
    expect(
      screen
        .getByRole('button', { name: 'Larger text' })
        .getAttribute('aria-disabled'),
    ).not.toBe('true'),
  );
  fireEvent.click(screen.getByRole('button', { name: 'Larger text' }));
  expect(await screen.findByText('Your preview')).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: 'Apply to my space' }));
  await waitFor(() => expect(screen.queryByText('Your preview')).toBeNull());
  const saved = JSON.parse(
    (await storage.getItem('customitin:recipe-demo:v2:ui-test:head')) ?? '{}',
  );
  expect(saved.current.theme['type.scale']).toBe(1.2);
  await waitFor(() =>
    expect(
      screen
        .getByRole('button', { name: 'Undo last change' })
        .getAttribute('aria-disabled'),
    ).not.toBe('true'),
  );
  fireEvent.click(screen.getByRole('button', { name: 'Undo last change' }));
  await waitFor(async () => {
    const result = JSON.parse(
      (await storage.getItem('customitin:recipe-demo:v2:ui-test:head')) ?? '{}',
    );
    expect(result.current.theme).toEqual({});
  });
});
