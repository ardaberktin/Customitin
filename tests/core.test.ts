import { describe, expect, it } from 'vitest';
import {
  applyProposal,
  createProfile,
  makeProposal,
  reconcileProfile,
  validateProfile,
  validateQuery,
  type Proposal,
} from '@customitin/core';
import { registries, section } from '../examples/shared/src/registry';
import { demoPlan } from '../examples/shared/src/demo-planner';
const registry = registries.recipe;
const initial = () => createProfile(registry, 'alice');
const change = (tokens = { 'type.scale': 1.2 }) =>
  makeProposal(
    initial(),
    [{ op: 'setThemeTokens', tokens }],
    'request-1',
    'Larger text',
  );
describe('configuration contracts', () => {
  it('expresses all three domains with identical schema and assigns permanent view identities', () => {
    for (const kind of ['recipe', 'movie', 'task'] as const) {
      const current = createProfile(registries[kind], 'alice');
      const result = demoPlan(kind, {
        appId: registries[kind].appId,
        registryRevision: registries[kind].revision,
        requestId: 'request',
        baseRevision: 0,
        instruction:
          kind === 'recipe'
            ? 'quick recipes in a grid'
            : kind === 'movie'
              ? 'unwatched movies in a grid'
              : 'upcoming tasks',
        configuration: {
          theme: {},
          surfaces: current.surfaces,
          navigation: current.navigation,
          views: [],
        },
      });
      expect(result.kind).toBe('proposal');
      if (result.kind !== 'proposal') continue;
      const next = applyProposal(
        current,
        result.proposal,
        registries[kind],
        () => 'permanent-id',
      );
      expect(next.views[0]?.id).toBe('permanent-id');
      expect(next.navigation.at(-1)?.id).toBe('permanent-id');
      expect(next.surfaces.home?.[1]?.viewId).toBe('permanent-id');
    }
  });
  it('applies atomically and never mutates the old profile', () => {
    const current = initial();
    const invalid: Proposal = {
      ...change(),
      operations: [
        ...change().operations,
        { op: 'setThemeTokens', tokens: { unknown: true } },
      ],
    };
    expect(() => applyProposal(current, invalid, registry)).toThrow('unknown');
    expect(current.theme).toEqual({});
    expect(current.revision).toBe(0);
  });
  it.each([
    [
      'unknown token',
      { operations: [{ op: 'setThemeTokens', tokens: { fake: true } }] },
    ],
    [
      'out of range',
      { operations: [{ op: 'setThemeTokens', tokens: { 'type.scale': 10 } }] },
    ],
    [
      'unrestricted path',
      { operations: [{ op: 'replace', path: '/scope', value: 'bob' }] },
    ],
    ['unknown property', { scope: 'bob' }],
    ['stale revision', { baseRevision: 9 }],
    ['stale registry', { registryRevision: 'unknown' }],
  ])('rejects %s', (_, patch) => {
    expect(() =>
      applyProposal(initial(), { ...change(), ...patch }, registry),
    ).toThrow();
  });
  it('retains protected sections and navigation', () => {
    expect(() =>
      applyProposal(
        initial(),
        makeProposal(
          initial(),
          [{ op: 'setSurfaceLayout', surfaceId: 'home', nodes: [] }],
          'r',
          'hide all',
        ),
        registry,
      ),
    ).toThrow('Required controls');
    expect(() =>
      applyProposal(
        initial(),
        makeProposal(
          initial(),
          [{ op: 'setNavigationPlacements', placements: [] }],
          'r',
          'hide navigation',
        ),
        registry,
      ),
    ).toThrow('Required navigation');
  });
  it('rejects invalid properties, excessive depth and unknown components', () => {
    const base = initial();
    for (const node of [
      { ...section('bad', 'text'), props: { text: 'Hi', run: 'code' } },
      section('bad', 'invented'),
    ])
      expect(() =>
        validateProfile(
          { ...base, surfaces: { home: [section('intro'), node] } },
          registry,
        ),
      ).toThrow();
    let nested = section('end', 'stack');
    for (let i = 0; i < 9; i++)
      nested = { ...section(`stack-${i}`, 'stack'), children: [nested] };
    expect(() =>
      validateProfile(
        { ...base, surfaces: { home: [section('intro'), nested] } },
        registry,
      ),
    ).toThrow('complex');
  });
  it('validates detail params, navigation limits and partial-cache semantics', () => {
    const profile = initial();
    expect(() =>
      validateProfile(
        {
          ...profile,
          navigation: [
            ...profile.navigation,
            {
              target: 'destination',
              id: 'detail',
              label: 'Details',
              placement: 'overflow',
              params: { userId: 'other-user' },
            },
          ],
        },
        registry,
      ),
    ).toThrow();
    const source = registry.sources[0]!;
    expect(() =>
      validateQuery(
        { filters: [{ field: 'minutes', op: 'lte', value: 20 }], sort: [] },
        { ...source, completeness: 'partial' },
      ),
    ).toThrow('partially');
    expect(() =>
      validateQuery(
        { filters: [], sort: [], groupBy: 'genre' },
        registries.movie.sources[0]!,
      ),
    ).toThrow('grouping');
  });
  it('disables a removed-field customization without broadening its filters', () => {
    const current = initial();
    const result = demoPlan('recipe', {
      requestId: 'r',
      appId: registry.appId,
      registryRevision: registry.revision,
      baseRevision: 0,
      instruction: 'quick recipes',
      configuration: current,
    });
    if (result.kind !== 'proposal') throw new Error('fixture');
    const customized = applyProposal(current, result.proposal, registry);
    const nextRegistry = JSON.parse(
      JSON.stringify(registry),
    ) as typeof registry;
    nextRegistry.revision = `${registry.revision}-removed-field`;
    delete nextRegistry.sources[0]!.fields.minutes;
    const { profile, warnings } = reconcileProfile(
      customized,
      nextRegistry,
      'alice',
    );
    expect(profile.views).toEqual([]);
    expect(profile.surfaces.home).toEqual(
      nextRegistry.surfaces[0]?.defaultLayout,
    );
    expect(warnings.length).toBeGreaterThan(0);
    expect(customized.views).toHaveLength(1);
  });
});
