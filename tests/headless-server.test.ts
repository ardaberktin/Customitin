import { expect, it, vi } from 'vitest';
import {
  createActionHandler,
  createDataHandler,
  createPlannerHandler,
} from '@customitin/server';
import {
  createProfile,
  dataPlanSchema,
  makeProposal,
  type ActionProposal,
} from '@customitin/core';
import { workspaceRegistry as registry } from '../examples/shared/src/headless/registry';
const proposal: ActionProposal = {
  requestId: 'a',
  registryRevision: registry.revision,
  baseRevision: 0,
  surfaceId: 'workspace',
  actionId: 'complete',
  arguments: { id: 'one' },
  summary: 'Complete activity one',
};
const options = {
  manifests: [registry],
  authenticate: async () => ({ subject: 'alice', appIds: [registry.appId] }),
  allowRequest: async () => true,
  context: async () => ({ scope: 'alice', revision: 0 }),
};
const http = (body: object) =>
  new Request('https://app.example/execute', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      appId: registry.appId,
      registryRevision: registry.revision,
      surfaceId: 'workspace',
      ...body,
    }),
  });
it('executes only authorized, current action proposals with host-owned durable idempotency', async () => {
  const execute = vi.fn(async () => ({ done: true }));
  const results = new Map<string, Promise<{ done: boolean }>>();
  const handler = createActionHandler({
    ...options,
    actions: { complete: { execute } },
    idempotent: async (key, dispatch) => {
      if (!results.has(key))
        results.set(key, dispatch() as Promise<{ done: boolean }>);
      return results.get(key)!;
    },
  });
  const first = await handler(http({ proposal }));
  expect(first.status).toBe(200);
  expect(await first.json()).toEqual({ done: true });
  await handler(http({ proposal }));
  expect(execute).toHaveBeenCalledTimes(1);
  expect(execute).toHaveBeenCalledWith(
    proposal.arguments,
    expect.objectContaining({
      appId: registry.appId,
      scope: 'alice',
      proposal,
    }),
  );
  for (const changed of [
    { ...proposal, baseRevision: 2 },
    { ...proposal, actionId: 'delete' },
    { ...proposal, arguments: { id: 1 } },
    { ...proposal, surfaceId: 'elsewhere' },
  ])
    expect((await handler(http({ proposal: changed }))).status).toBe(422);
  expect(execute).toHaveBeenCalledTimes(1);
});
it('rechecks the account and revision immediately before backend mutation dispatch', async () => {
  let reads = 0;
  const execute = vi.fn(async () => ({ done: true }));
  const handler = createActionHandler({
    ...options,
    context: async () => ({
      scope: ++reads === 1 ? 'alice' : 'bob',
      revision: 0,
    }),
    actions: { complete: { execute } },
    idempotent: async (_key, dispatch) => dispatch(),
  });
  expect((await handler(http({ proposal }))).status).toBe(422);
  expect(execute).not.toHaveBeenCalled();
});
it('enforces remote data field permissions and validates completeness and projection on the server', async () => {
  const plan = dataPlanSchema.parse({
    sourceId: 'activity',
    execution: 'remote',
    project: ['id', 'hours'],
  });
  const execute = vi.fn(async () => ({
    rows: [{ id: 'one', hours: 3 }],
    keys: ['one'],
    complete: true,
    nextCursor: null as string | null,
  }));
  const handler = createDataHandler({ ...options, adapter: { execute } });
  expect((await handler(http({ plan }))).status).toBe(200);
  expect(execute).toHaveBeenCalledWith(
    plan,
    expect.objectContaining({
      appId: registry.appId,
      registryRevision: registry.revision,
      surfaceId: 'workspace',
      scope: 'alice',
    }),
    undefined,
  );
  expect(
    (await handler(http({ plan: { ...plan, project: ['secret'] } }))).status,
  ).toBe(422);
  expect((await handler(http({ plan, surfaceId: 'missing' }))).status).toBe(
    422,
  );
  expect(execute).toHaveBeenCalledTimes(1);
  execute.mockResolvedValue({
    rows: [{ id: 'one', hours: 3 }],
    keys: ['one'],
    complete: true,
    nextCursor: 'next',
  });
  expect((await handler(http({ plan }))).status).toBe(422);
});
it('restricts planner metadata and proposals to explicit surfaces and exposes no row data', async () => {
  const restricted = structuredClone(registry);
  restricted.surfaces.push({
    ...restricted.surfaces[0]!,
    id: 'private',
    allowedComponentIds: [],
    policy: {
      ...restricted.surfaces[0]!.policy,
      sourceFields: {},
      actionIds: [],
    },
  });
  const profile = createProfile(restricted, 'alice');
  const generate = vi.fn(async ({ request }) => ({
    kind: 'proposal',
    proposal: makeProposal(
      profile,
      [{ op: 'setSurfaceLayout', surfaceId: 'private', nodes: [] }],
      request.requestId,
      'Escape scope',
    ),
  }));
  const handler = createPlannerHandler({
    ...options,
    manifests: [restricted],
    provider: { generate },
  });
  const request = {
    requestId: 'r',
    baseRevision: 0,
    instruction: 'Change private',
    configuration: {
      surfaces: profile.surfaces,
      views: [],
      dataViews: [],
      theme: {},
      navigation: [],
    },
  };
  expect((await (await handler(http(request))).json()).kind).toBe('rejected');
  expect(generate).toHaveBeenCalledTimes(2);
  expect(
    generate.mock.calls[0]![0].registry.surfaces.map(
      (surface: { id: string }) => surface.id,
    ),
  ).toEqual(['workspace']);
  expect(
    generate.mock.calls[0]![0].request.configuration.surfaces.private,
  ).toBeUndefined();
});
