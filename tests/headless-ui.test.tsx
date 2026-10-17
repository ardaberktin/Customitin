// @vitest-environment jsdom
import { afterEach, expect, it } from 'vitest';
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { memoryStorage, type StorageAdapter } from '@customitin/core';
import {
  CustomizationProvider,
  SurfaceRenderer,
  useAssistant,
  useAction,
  type HostComponentProps,
} from '@customitin/react';
import {
  workspaceRegistry,
  workspaceData,
  workspacePlanner,
} from '../examples/shared/src/headless';
const data = workspaceData();
function Widget({ values, data: inputs }: HostComponentProps) {
  return (
    <section>
      <h3>{String(values.title)}</h3>
      {inputs?.series?.rows.map((row) => (
        <p key={String(row.label)}>
          {String(row.label)}: {String(row.value)}
        </p>
      ))}
    </section>
  );
}
const bindings = { ...data, components: { chart: Widget, table: Widget } };
function Controls() {
  const assistant = useAssistant(['workspace']),
    action = useAction('workspace');
  return (
    <>
      <button
        disabled={assistant.loading}
        onClick={() => void assistant.request('Show team hours')}
      >
        Chart
      </button>
      <button onClick={() => void assistant.request('Show targets as a table')}>
        Table
      </button>
      <button onClick={() => void assistant.request('Complete activity one')}>
        Action
      </button>
      {assistant.preview ? (
        <>
          <div data-testid="preview">
            <SurfaceRenderer id="workspace" preview />
          </div>
          <button onClick={() => void assistant.apply()}>Apply</button>
          <button onClick={assistant.cancel}>Cancel</button>
        </>
      ) : null}
      {action.status === 'proposed' ? (
        <button onClick={() => void action.execute(async () => true)}>
          Confirm
        </button>
      ) : null}
      <p>{action.status}</p>
      <button
        disabled={!assistant.canUndo}
        onClick={() => void assistant.undo()}
      >
        Undo
      </button>
      <div data-testid="applied">
        <SurfaceRenderer id="workspace" />
      </div>
    </>
  );
}
function App({ storage }: { storage: StorageAdapter }) {
  return (
    <CustomizationProvider
      options={{
        registry: workspaceRegistry,
        storage,
        scope: 'alice',
        planner: workspacePlanner,
      }}
      bindings={bindings}
    >
      <Controls />
    </CustomizationProvider>
  );
}
afterEach(cleanup);
it('renders only host UI and supports previews, reuse with another dataset, persistence and undo', async () => {
  const storage = memoryStorage();
  const mounted = render(<App storage={storage} />);
  await waitFor(() =>
    expect((screen.getByText('Chart') as HTMLButtonElement).disabled).toBe(
      false,
    ),
  );
  expect(screen.getByTestId('applied').childElementCount).toBe(0);
  fireEvent.click(screen.getByText('Chart'));
  expect(await screen.findByText('Design: 8')).toBeTruthy();
  expect(screen.getByTestId('applied').textContent).toBe('');
  fireEvent.click(screen.getByText('Cancel'));
  expect(screen.queryByText('Design: 8')).toBeNull();
  fireEvent.click(screen.getByText('Table'));
  expect(await screen.findByText('Design: 12')).toBeTruthy();
  fireEvent.click(screen.getByText('Apply'));
  await waitFor(() => expect(screen.queryByTestId('preview')).toBeNull());
  mounted.unmount();
  render(<App storage={storage} />);
  expect(await screen.findByText('Engineering: 24')).toBeTruthy();
  fireEvent.click(screen.getByText('Undo'));
  await waitFor(() =>
    expect(screen.getByTestId('applied').textContent).toBe(''),
  );
});
it('chat exposes a host-owned confirmation before dispatching an action', async () => {
  render(<App storage={memoryStorage()} />);
  await waitFor(() =>
    expect((screen.getByText('Chart') as HTMLButtonElement).disabled).toBe(
      false,
    ),
  );
  fireEvent.click(screen.getByText('Action'));
  const confirm = await screen.findByText('Confirm');
  expect(screen.getByText('proposed')).toBeTruthy();
  fireEvent.click(confirm);
  expect(await screen.findByText('succeeded')).toBeTruthy();
});
