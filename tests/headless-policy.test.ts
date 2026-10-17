import { expect, it } from 'vitest';
import {
  defineCapabilities,
  defineComponent,
  defineSurface,
  createProfile,
  validatePlanningTarget,
  applyProposal,
  makeProposal,
  memoryStorage,
  ProfileStore,
  CustomizationRuntime,
  type Profile,
} from '@customitin/core';
const provenance = {
  version: 1,
  status: 'developer-reviewed' as const,
  evidence: 'Host property example',
};
const node = {
  id: 'title',
  componentId: 'heading',
  props: { text: 'Welcome', size: 20 },
  children: [],
};
const registry = defineCapabilities({
  appId: 'property-example',
  revision: 'v2',
  components: [
    defineComponent({
      id: 'heading',
      title: 'Heading',
      kind: 'host',
      props: {
        text: { type: 'string', required: true },
        size: { type: 'number', required: true, min: 16, max: 32 },
      },
      acceptsChildren: false,
      provenance,
    }),
  ],
  surfaces: [
    defineSurface({
      id: 'title',
      title: 'Page title',
      mode: 'properties',
      policy: { operations: ['properties'], editableProps: ['text'] },
      defaultLayout: [node],
      allowedComponentIds: ['heading'],
      requiredNodeIds: [],
      provenance,
    }),
    defineSurface({
      id: 'locked',
      title: 'Locked region',
      defaultLayout: [],
      allowedComponentIds: ['heading'],
      requiredNodeIds: [],
      provenance,
    }),
  ],
  sources: [],
  actions: [],
  relations: [],
  themeTokens: {},
  defaultNavigation: [],
  destinations: [],
  limits: { sources: 1, nodes: 10, depth: 3, tabs: 2 },
});
it('edits only approved properties while retaining element identity and constraining targets', () => {
  const profile = createProfile(registry, 'alice');
  const change = (nodes: (typeof node)[]) =>
    makeProposal(
      profile,
      [{ op: 'setSurfaceLayout', surfaceId: 'title', nodes }],
      'r',
      'Edit title',
    );
  const valid = change([
    { ...node, props: { ...node.props, text: 'My title' } },
  ]);
  validatePlanningTarget(registry, ['title'], valid.operations);
  expect(
    applyProposal(profile, valid, registry).surfaces.title?.[0]?.props.text,
  ).toBe('My title');
  for (const nodes of [
    [],
    [{ ...node, id: 'new' }],
    [{ ...node, props: { ...node.props, size: 28 } }],
  ])
    expect(() => applyProposal(profile, change(nodes), registry)).toThrow();
  expect(() => validatePlanningTarget(registry)).toThrow('Select');
  expect(() =>
    validatePlanningTarget(registry, ['locked'], valid.operations),
  ).toThrow('another');
  expect(() =>
    validatePlanningTarget(
      registry,
      ['locked'],
      [{ op: 'setSurfaceLayout', surfaceId: 'locked', nodes: [node] }],
    ),
  ).toThrow('unavailable');
});
it('preserves v1 bytes, migrates stable host identities, and never resurrects them after erasure', async () => {
  const storage = memoryStorage();
  const original = createProfile(registry, 'alice');
  const raw = JSON.stringify({
    current: {
      ...original,
      schemaVersion: 1,
      registryRevision: 'old',
      theme: { 'appearance.mode': 'dark' },
    },
    history: [],
  });
  const key = 'customitin:property-example:v1:alice:head';
  await storage.setItem(key, raw);
  const store = new ProfileStore(storage, registry, 'alice');
  const migrated = await store.load();
  expect(migrated.record.current.schemaVersion).toBe(2);
  expect(migrated.record.current.surfaces.title).toEqual([node]);
  expect(
    migrated.warnings.some((warning) => warning.includes('appearance')),
  ).toBe(true);
  expect(await storage.getItem(key)).toBe(raw);
  await store.update((record) => ({
    ...record,
    current: { ...record.current, name: 'Current' },
  }));
  await store.erase();
  expect((await store.load()).record.current.name).toBe('My space');
  expect(await storage.getItem(key)).toBe(raw);
});
it('rejects stale previews and keeps actions blocked until layout storage completes', async () => {
  const { workspaceRegistry, workspaceData } =
    await import('../examples/shared/src/headless');
  let release: (() => void) | undefined;
  const backing = memoryStorage();
  const storage = {
    ...backing,
    async setItem(key: string, value: string) {
      await new Promise<void>((resolve) => {
        release = resolve;
      });
      await backing.setItem(key, value);
    },
  };
  const runtime = new CustomizationRuntime({
    registry: workspaceRegistry,
    storage,
    scope: 'alice',
    actions: workspaceData().actions,
  });
  await runtime.start();
  runtime.previewOperations(
    [{ op: 'setSurfaceLayout', surfaceId: 'workspace', nodes: [] }],
    'Apply',
    'workspace',
  );
  const writing = runtime.apply();
  runtime.cancelPreview();
  expect(() =>
    runtime.actions.propose({
      requestId: 'a',
      registryRevision: workspaceRegistry.revision,
      baseRevision: 0,
      surfaceId: 'workspace',
      actionId: 'complete',
      arguments: { id: 'one' },
      summary: 'Complete',
    }),
  ).toThrow('preview');
  // Each atomic storage write is deliberately gated to cover the entire apply transaction.
  for (let i = 0; i < 3; i++) {
    await new Promise((resolve) => setTimeout(resolve, 0));
    release?.();
  }
  await writing;
  expect(runtime.getSnapshot().profile?.revision).toBe(1);
});
it('prefers a valid v2 backup to an old v1 head', async () => {
  const storage = memoryStorage(),
    profile: Profile = {
      ...createProfile(registry, 'alice'),
      name: 'V2 backup',
    };
  await storage.setItem(
    'customitin:property-example:v1:alice:head',
    JSON.stringify({
      current: { ...profile, schemaVersion: 1, name: 'V1 head' },
      history: [],
    }),
  );
  await storage.setItem(
    'customitin:property-example:v2:alice:backup',
    JSON.stringify({ current: profile, history: [] }),
  );
  expect(
    (await new ProfileStore(storage, registry, 'alice').load()).record.current
      .name,
  ).toBe('V2 backup');
});
