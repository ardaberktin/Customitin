import assert from 'node:assert/strict';
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import {
  SurfaceRenderer,
  useAssistant,
  useCustomization,
} from '@customitin/react';
import { PersonalizationRoot } from '../personalize/root';
import OriginalApp from '../App';

function Workspace() {
  const assistant = useAssistant(['workspace']);
  const { diagnostics } = useCustomization();
  assert.deepEqual(diagnostics, []);
  return (
    <>
      <button
        disabled={assistant.loading}
        onClick={() => void assistant.request('hours')}
      >
        Hours
      </button>
      <button
        disabled={assistant.loading}
        onClick={() => void assistant.request('budgets')}
      >
        Budgets
      </button>
      <button
        disabled={!assistant.canUndo}
        onClick={() => void assistant.undo()}
      >
        Undo
      </button>
      <output data-testid="error">{assistant.code}</output>
      {assistant.preview && (
        <div data-testid="preview">
          <SurfaceRenderer
            id="workspace"
            preview
            status={({ code }) => <p>{code}</p>}
          />
          <button onClick={assistant.cancel}>Discard</button>
          <button onClick={() => void assistant.apply()}>Apply</button>
        </div>
      )}
      <div data-testid="applied">
        <SurfaceRenderer id="workspace" status={({ code }) => <p>{code}</p>} />
      </div>
    </>
  );
}
function App() {
  return (
    <PersonalizationRoot>
      <Workspace />
    </PersonalizationRoot>
  );
}
const click = (name: string) =>
  fireEvent.click(screen.getByRole('button', { name }));
const applied = () => within(screen.getByTestId('applied'));
const preview = async () => within(await screen.findByTestId('preview'));

export async function run() {
  const original = render(<OriginalApp />);
  click('Count 0');
  assert.ok(screen.getByRole('button', { name: 'Count 1' }));
  original.unmount();
  let mounted = render(<App />);
  await waitFor(() =>
    assert.equal(
      (screen.getByRole('button', { name: 'Hours' }) as HTMLButtonElement)
        .disabled,
      false,
    ),
  );
  assert.equal(screen.getByTestId('applied').textContent, '');
  click('Hours');
  await (await preview()).findByText('Design: 8');
  assert.equal(screen.getByTestId('applied').textContent, '');
  click('Discard');
  assert.ok(screen.queryByTestId('preview') === null);
  click('Hours');
  await (await preview()).findByText('Engineering: 16');
  click('Apply');
  await waitFor(() => assert.ok(screen.queryByTestId('preview') === null));
  await applied().findByText('Design: 8');
  click('Budgets');
  await (await preview()).findByText('Design: 120');
  // Reuse exactly the same discovered chart, with explicit mappings to differently named fields.
  assert.ok(applied().getByText('Design: 8'));
  click('Apply');
  await waitFor(() => assert.ok(screen.queryByTestId('preview') === null));
  await applied().findByText('Engineering: 240');
  mounted.unmount();
  mounted = render(<App />);
  await applied().findByText('Engineering: 240');
  click('Undo');
  await applied().findByText('Engineering: 16');
  assert.equal(screen.getByTestId('error').textContent, '');
  mounted.unmount();
  cleanup();
  console.log(
    'Generated chart: preview/discard/apply, second dataset, persistence and undo passed.',
  );
}
