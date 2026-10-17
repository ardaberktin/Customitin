// @vitest-environment jsdom
import { useEffect, useState } from 'react';
import { Text, Pressable } from 'react-native';
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { PersonalizationHost } from '../examples/shared/src/ui/composer/host';
import { memoryStorage } from '../packages/react-native/src/storage/profile-store';
import { registries } from '../examples/shared/src/registry';
import { demoPlan } from '../examples/shared/src/demo-planner';
import { createDemoSource } from '../examples/shared/src/sources';

afterEach(cleanup);
it('keeps the original workflow mounted and opens applied saved views and host details', async () => {
  const unmount = vi.fn();
  const navigate = vi.fn();
  function Original() {
    const [count, setCount] = useState(0);
    useEffect(() => () => unmount(), []);
    return (
      <Pressable
        accessibilityRole="button"
        onPress={() => setCount((n) => n + 1)}
      >
        <Text>Original count {count}</Text>
      </Pressable>
    );
  }
  render(
    <PersonalizationHost
      options={{
        registry: registries.recipe,
        storage: memoryStorage(),
        scope: 'person',
        planner: {
          async plan(request) {
            return demoPlan('recipe', request);
          },
        },
      }}
      bindings={{ sources: { catalog: createDemoSource('recipe') }, navigate }}
    >
      <Original />
    </PersonalizationHost>,
  );
  fireEvent.click(screen.getByText('Original count 0'));
  fireEvent.click(screen.getByRole('button', { name: 'Customize' }));
  await waitFor(() =>
    expect(
      screen
        .getByRole('button', { name: 'Larger text' })
        .getAttribute('aria-disabled'),
    ).not.toBe('true'),
  );
  fireEvent.change(screen.getByTestId('customization-prompt'), {
    target: { value: 'Show quick recipes in a grid' },
  });
  fireEvent.click(screen.getByTestId('preview-button'));
  await screen.findByTestId('preview-panel');
  fireEvent.click(screen.getByTestId('apply-button'));
  await waitFor(() => expect(screen.queryByTestId('preview-panel')).toBeNull());
  fireEvent.click(screen.getByRole('button', { name: 'My space' }));
  fireEvent.click(
    await screen.findByRole('button', { name: 'Quick & lovely' }),
  );
  fireEvent.click(
    await screen.findByRole('button', { name: 'Open Lemon & herb orzo' }),
  );
  expect(navigate).toHaveBeenCalled();
  expect(screen.getByText('Original count 1')).toBeTruthy();
  expect(unmount).not.toHaveBeenCalled();
});
