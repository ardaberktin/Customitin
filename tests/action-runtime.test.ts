import { expect, it, vi } from 'vitest';
import {
  ActionRuntime,
  CustomizationRuntime,
  memoryStorage,
  type ActionProposal,
} from '@customitin/core';
import {
  workspaceRegistry as registry,
  workspaceData,
  workspacePlanner,
} from '../examples/shared/src/headless';
const proposal = (): ActionProposal => ({
  requestId: 'action-one',
  registryRevision: registry.revision,
  baseRevision: 0,
  surfaceId: 'workspace',
  actionId: 'complete',
  arguments: { id: 'one' },
  summary: 'Complete activity one',
});
function setup() {
  const context = {
    scope: 'alice',
    revision: 0,
    preview: false,
    signal: new AbortController().signal,
  };
  const execute = vi.fn(
      async (
        _args: Record<string, import('@customitin/core').Scalar>,
        _context: import('@customitin/core').ActionContext,
      ) => ({ done: true }),
    ),
    invalidate = vi.fn();
  const runtime = new ActionRuntime({
    registry,
    context: () => context,
    bindings: { complete: { execute } },
    invalidate,
  });
  return { runtime, context, execute, invalidate };
}
it('requires host confirmation and never runs actions while applying a layout', async () => {
  const { runtime, execute } = setup();
  runtime.propose(proposal());
  expect(execute).not.toHaveBeenCalled();
  await runtime.execute();
  expect(runtime.getSnapshot().code).toBe('CONFIRMATION_REQUIRED');
  expect(execute).not.toHaveBeenCalled();
});
it('executes once with idempotency context and refreshes dependent sources', async () => {
  const { runtime, execute, invalidate } = setup();
  runtime.propose(proposal());
  await runtime.execute(async () => true);
  expect(runtime.getSnapshot().status).toBe('succeeded');
  expect(execute).toHaveBeenCalledOnce();
  expect(execute.mock.calls[0]?.[1]).toMatchObject({
    scope: 'alice',
    appId: registry.appId,
    proposal: proposal(),
    idempotencyKey: JSON.stringify([
      'headless-workspace',
      'alice',
      'action-one',
    ]),
  });
  expect(invalidate).toHaveBeenCalledWith(['activity']);
  expect(() => runtime.propose(proposal())).toThrow('already');
});
it('revalidates scope, revision, availability and preview after confirmation', async () => {
  for (const change of ['scope', 'revision', 'preview'] as const) {
    const { runtime, execute, context } = setup();
    runtime.propose(proposal());
    await runtime.execute(async () => {
      if (change === 'scope') context.scope = 'bob';
      else if (change === 'revision') context.revision++;
      else context.preview = true;
      return true;
    });
    expect(execute).not.toHaveBeenCalled();
    expect(runtime.getSnapshot().status).toBe('failed');
  }
});
it('rejects invalid targets and arguments; cancellation and errors never retry mutations', async () => {
  const { runtime, context, execute } = setup();
  context.preview = true;
  expect(() => runtime.propose(proposal())).toThrow('preview');
  context.preview = false;
  expect(() => runtime.propose({ ...proposal(), surfaceId: 'other' })).toThrow(
    'unavailable',
  );
  expect(() =>
    runtime.propose({ ...proposal(), arguments: { bad: 'id' } }),
  ).toThrow();
  runtime.propose(proposal());
  await runtime.execute(async () => false);
  expect(execute).not.toHaveBeenCalled();
  runtime.propose(proposal());
  execute.mockRejectedValueOnce(new Error('Network outcome unknown'));
  await runtime.execute(async () => true);
  expect(execute).toHaveBeenCalledOnce();
  expect(() => runtime.propose(proposal())).toThrow('already');
});
it('keeps action proposals separate from layout history and clears conversation on account changes', async () => {
  const data = workspaceData(),
    execute = vi.spyOn(data.actions.complete!, 'execute');
  const runtime = new CustomizationRuntime({
    registry,
    storage: memoryStorage(),
    scope: 'alice',
    planner: workspacePlanner,
    actions: data.actions,
  });
  await runtime.start();
  await runtime.request('Show team hours', 'workspace');
  await runtime.apply();
  expect(execute).not.toHaveBeenCalled();
  await runtime.request('Complete activity one', 'workspace');
  expect(runtime.getSnapshot().preview).toBeUndefined();
  expect(runtime.actions.getSnapshot().status).toBe('proposed');
  await runtime.actions.execute(async () => true);
  await runtime.undo();
  expect(execute).toHaveBeenCalledOnce();
  expect(runtime.getSnapshot().conversation?.length).toBeGreaterThan(0);
  await runtime.switchScope('bob');
  expect(runtime.getSnapshot().conversation ?? []).toEqual([]);
  expect(runtime.actions.getSnapshot().proposal).toBeUndefined();
  runtime.dispose();
});
