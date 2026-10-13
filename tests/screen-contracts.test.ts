import { expect, it, vi } from 'vitest';
import {
  applyProposal,
  createProfile,
  makeProposal,
  reconcileProfile,
  validatePlanningTarget,
  type CapabilityRegistry,
  type Operation,
} from '@customitin/core';
import { createPlannerHandler } from '@customitin/server';
import { CustomizationRuntime } from '../packages/react-native/src/provider/runtime';
import { memoryStorage } from '../packages/react-native/src/storage/profile-store';
import { registries } from '../examples/shared/src/registry';

const registry: CapabilityRegistry = {
  ...registries.recipe,
  surfaces: registries.recipe.surfaces.map((surface) => ({
    ...surface,
    kind: 'screen',
  })),
};
const profile = createProfile(registry, 'alice');
const nodes = profile.surfaces.home!;
const layout = (next = nodes): Operation => ({
  op: 'setSurfaceLayout',
  surfaceId: 'home',
  nodes: next,
});

it('allows existing sections to move/hide but rejects duplicates, replacements, changed props and hidden required controls', () => {
  const valid = makeProposal(
    profile,
    [layout([...nodes].reverse())],
    'request',
    'Reorder',
  );
  expect(applyProposal(profile, valid, registry).surfaces.home).toEqual(
    [...nodes].reverse(),
  );
  expect(
    applyProposal(
      profile,
      makeProposal(profile, [layout([nodes[0]!])], 'r', 'Hide optional'),
      registry,
    ).surfaces.home,
  ).toHaveLength(1);
  for (const next of [
    [],
    [nodes[0]!, nodes[0]!],
    [{ ...nodes[0]!, id: 'replacement' }],
    [{ ...nodes[0]!, props: { text: 'changed' } }],
  ])
    expect(() =>
      applyProposal(
        profile,
        makeProposal(profile, [layout(next)], 'r', 'Invalid'),
        registry,
      ),
    ).toThrow();
  expect(() =>
    validatePlanningTarget(registry, 'home', [
      { op: 'setNavigationPlacements', placements: profile.navigation },
    ]),
  ).toThrow('another screen');
});

it('restores a saved screen after a section is removed instead of rendering stale section identities', () => {
  const saved = applyProposal(
    profile,
    makeProposal(profile, [layout([...nodes].reverse())], 'r', 'Reorder'),
    registry,
  );
  const updated: CapabilityRegistry = {
    ...registry,
    revision: 'screen-v2',
    surfaces: registry.surfaces.map((surface) => ({
      ...surface,
      defaultLayout: surface.defaultLayout.slice(0, 2),
    })),
  };
  const result = reconcileProfile(saved, updated, 'alice');
  expect(result.profile.surfaces.home).toEqual(nodes.slice(0, 2));
  expect(result.warnings).toContain(
    'A layout was restored to its original sections.',
  );
});

it('sends the active screen to the planner and rejects responses that change navigation on the client', async () => {
  const plan = vi.fn(async (request) => ({
    kind: 'proposal' as const,
    proposal: makeProposal(
      profile,
      [{ op: 'setNavigationPlacements', placements: profile.navigation }],
      request.requestId,
      'Change navigation',
    ),
  }));
  const runtime = new CustomizationRuntime({
    registry,
    storage: memoryStorage(),
    scope: 'alice',
    planner: { plan },
  });
  await runtime.start();
  await runtime.request('Move featured first', 'home');
  expect(plan.mock.calls[0]?.[0].surfaceId).toBe('home');
  expect(runtime.getSnapshot().preview).toBeUndefined();
  expect(runtime.getSnapshot().profile?.revision).toBe(0);
});

it('tags screen previews and clears them on cancel, apply and account changes', async () => {
  const runtime = new CustomizationRuntime({
    registry,
    storage: memoryStorage(),
    scope: 'alice',
  });
  await runtime.start();
  runtime.previewOperations([layout([...nodes].reverse())], 'Reorder', 'home');
  expect(runtime.getSnapshot().previewSurfaceId).toBe('home');
  runtime.cancelPreview();
  expect(runtime.getSnapshot().previewSurfaceId).toBeUndefined();
  runtime.previewOperations([layout([...nodes].reverse())], 'Reorder', 'home');
  await runtime.apply();
  expect(runtime.getSnapshot().previewSurfaceId).toBeUndefined();
  runtime.previewOperations([layout()], 'Restore', 'home');
  await runtime.switchScope('bob');
  expect(runtime.getSnapshot().preview).toBeUndefined();
  expect(runtime.getSnapshot().profile?.surfaces.home).toEqual(nodes);
});

it('validates a screen-scoped planner response on the backend, including its repair attempt', async () => {
  const generate = vi.fn(async ({ request }) => ({
    kind: 'proposal',
    proposal: makeProposal(
      profile,
      [{ op: 'setNavigationPlacements', placements: profile.navigation }],
      request.requestId,
      'Change navigation',
    ),
  }));
  const handler = createPlannerHandler({
    manifests: [registry],
    provider: { generate },
    authenticate: async () => ({ subject: 'alice', appIds: [registry.appId] }),
    allowRequest: async () => true,
  });
  const response = await handler(
    new Request('https://host.example/plan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        appId: registry.appId,
        registryRevision: registry.revision,
        requestId: 'r',
        baseRevision: 0,
        surfaceId: 'home',
        instruction: 'Move featured first',
        configuration: {
          surfaces: profile.surfaces,
          theme: profile.theme,
          views: profile.views,
          navigation: profile.navigation,
        },
      }),
    }),
  );
  expect((await response.json()).kind).toBe('rejected');
  expect(generate).toHaveBeenCalledTimes(2);
});
