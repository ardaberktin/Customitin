// @vitest-environment jsdom
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
import { controlledScreenConsumer } from './helpers/screen-consumer';
import { loadScreenConsumer } from './helpers/load-screen';

afterEach(cleanup);

async function setup() {
  const root = await consumer(controlledScreenConsumer);
  const plan = await installProject(root, {
    dryRun: false,
    overrides: overridesSchema.parse({
      version: 1,
      screens: {
        'Home.tsx#Home': { enabled: true, requiredSections: ['action'] },
      },
    }),
  });
  expect(plan.issues).toEqual([]);
  return loadScreenConsumer(root);
}
async function openEditor() {
  const button = await screen.findByRole('button', {
    name: 'Customize this screen',
  });
  await waitFor(() =>
    expect(button.getAttribute('aria-disabled')).not.toBe('true'),
  );
  fireEvent.click(button);
}
const click = (name: string) =>
  fireEvent.click(screen.getByRole('button', { name }));

it('customizes the generated existing screen in place while preserving host context, form state and actions', async () => {
  const { default: App } = await setup();
  render(<App />);
  await screen.findByText('Your account: signed-in');
  expect(screen.queryByText('My space')).toBeNull();
  fireEvent.change(screen.getByRole('textbox', { name: 'Trip note' }), {
    target: { value: 'Keep my draft' },
  });
  click('Existing action 0');
  await openEditor();
  expect(
    screen
      .getByRole('button', { name: 'Hide action' })
      .getAttribute('aria-disabled'),
  ).toBe('true');
  click('Hide notes');
  expect(screen.queryByRole('textbox', { name: 'Trip note' })).toBeNull();
  expect(
    (
      screen.getByRole('textbox', {
        name: 'Trip note',
        hidden: true,
      }) as HTMLInputElement
    ).value,
  ).toBe('Keep my draft');
  click('Move up: action');
  const heading = screen.getByTestId('existing-heading');
  const action = screen.getByRole('button', { name: 'Existing action 1' });
  expect(
    action.compareDocumentPosition(heading) & Node.DOCUMENT_POSITION_FOLLOWING,
  ).toBeTruthy();
  expect(heading.style.fontSize).toBe('20px');
  click('Discard preview');
  expect(heading.style.fontSize).toBe('20px');
  expect(
    (screen.getByRole('textbox', { name: 'Trip note' }) as HTMLInputElement)
      .value,
  ).toBe('Keep my draft');
  click('Hide notes');
  click('Apply changes');
  await waitFor(() =>
    expect(screen.queryByRole('button', { name: 'Apply changes' })).toBeNull(),
  );
  await waitFor(() =>
    expect(
      screen
        .getByRole('button', { name: 'Show notes' })
        .getAttribute('aria-disabled'),
    ).not.toBe('true'),
  );
  click('Show notes');
  expect(
    (screen.getByRole('textbox', { name: 'Trip note' }) as HTMLInputElement)
      .value,
  ).toBe('Keep my draft');
  click('Done customizing');
  expect(screen.queryByRole('textbox', { name: 'Trip note' })).toBeNull();
  click('Existing action 1');
  expect(
    screen.getByRole('button', { name: 'Existing action 2' }),
  ).toBeTruthy();
});

it('persists layout without changing host appearance across restart, supports undo, and restores the original layout', async () => {
  const { default: App } = await setup();
  const rendered = render(<App />);
  await openEditor();
  click('Hide notes');
  click('Apply changes');
  await waitFor(() =>
    expect(screen.queryByRole('button', { name: 'Apply changes' })).toBeNull(),
  );
  rendered.unmount();
  render(<App />);
  await openEditor();
  expect(screen.queryByRole('textbox', { name: 'Trip note' })).toBeNull();
  expect(screen.getByTestId('existing-heading').style.fontSize).toBe('20px');
  click('Undo last change');
  await screen.findByRole('textbox', { name: 'Trip note' });
  expect(screen.getByTestId('existing-heading').style.fontSize).toBe('20px');
  click('Hide notes');
  click('Restore this screen');
  expect(screen.getByRole('textbox', { name: 'Trip note' })).toBeTruthy();
});
