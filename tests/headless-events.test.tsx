// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest';
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import {
  CustomizationProvider,
  SurfaceRenderer,
  useAction,
  useAssistant,
  useCustomization,
  type HostComponentProps,
} from '@customitin/react';
import { memoryStorage, type CustomizationRuntime } from '@customitin/core';
import {
  workspaceData,
  workspacePlanner,
  workspaceRegistry,
} from '../examples/shared/src/headless';
const registry = structuredClone(workspaceRegistry);
registry.components.push({
  ...registry.components[0]!,
  id: 'control',
  props: {},
  dataInputs: {},
  events: {
    choose: { id: { type: 'string', required: true, nullable: false } },
  },
});
registry.surfaces[0]!.allowedComponentIds.push('control');
registry.surfaces[0]!.defaultLayout.push({
  id: 'control',
  componentId: 'control',
  props: {},
  children: [],
  events: {
    choose: { actionId: 'complete', arguments: { id: { field: 'id' } } },
  },
});
function HostControl({ events }: HostComponentProps) {
  return (
    <button onClick={() => events?.choose?.({ id: 'one' })}>
      Choose record
    </button>
  );
}
let runtime: CustomizationRuntime;
function Host() {
  const state = useCustomization();
  runtime = state.runtime;
  const assistant = useAssistant(['workspace']),
    action = useAction('workspace');
  return (
    <>
      <button
        disabled={assistant.loading}
        onClick={() => void assistant.request('Show team hours')}
      >
        Preview chart
      </button>
      <button onClick={() => void action.execute(async () => true)}>
        Execute action
      </button>
      <p>{action.status}</p>
      <div data-testid="surface">
        <SurfaceRenderer id="workspace" />
      </div>
      {assistant.preview ? <SurfaceRenderer id="workspace" preview /> : null}
    </>
  );
}
afterEach(cleanup);
it('typed host events only propose actions; execution invalidates joined data and cannot escape preview', async () => {
  const data = workspaceData();
  const execute = vi.fn(data.actions.complete!.execute);
  const query = vi.fn(data.sources.activity!.query);
  data.actions.complete = { execute };
  data.sources.activity = { ...data.sources.activity!, query };
  render(
    <CustomizationProvider
      options={{
        registry,
        storage: memoryStorage(),
        scope: 'alice',
        planner: workspacePlanner,
      }}
      bindings={{
        ...data,
        components: {
          control: HostControl,
          chart: ({ data: inputs }) => (
            <p>{inputs?.series?.rows.length ?? 0} teams</p>
          ),
        },
      }}
    >
      <Host />
    </CustomizationProvider>,
  );
  await waitFor(() =>
    expect(
      (screen.getByText('Preview chart') as HTMLButtonElement).disabled,
    ).toBe(false),
  );
  fireEvent.click(screen.getByText('Choose record'));
  expect(screen.getByText('proposed')).toBeTruthy();
  expect(execute).not.toHaveBeenCalled();
  fireEvent.click(screen.getByText('Preview chart'));
  await screen.findByText('2 teams');
  await act(async () => {
    await runtime.actions.execute(async () => true);
  });
  expect(execute).not.toHaveBeenCalled();
  await act(async () => {
    await runtime.apply();
  });
  await screen.findByText('2 teams');
  const before = query.mock.calls.length;
  act(() =>
    runtime.actions.propose({
      requestId: 'confirmed',
      registryRevision: registry.revision,
      baseRevision: runtime.getSnapshot().profile!.revision,
      surfaceId: 'workspace',
      actionId: 'complete',
      arguments: { id: 'one' },
      summary: 'Complete',
    }),
  );
  fireEvent.click(screen.getByText('Execute action'));
  await screen.findByText('succeeded');
  await waitFor(() => expect(query.mock.calls.length).toBeGreaterThan(before));
  expect(execute).toHaveBeenCalledTimes(1);
});
