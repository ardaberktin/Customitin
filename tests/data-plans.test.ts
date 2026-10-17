import { expect, it, vi } from 'vitest';
import {
  dataPlanSchema,
  executeDataPlan,
  validateDataPlan,
  expressionType,
  evaluateExpression,
  createLocalSource,
  type DataPlan,
} from '@customitin/core';
import {
  workspaceRegistry as registry,
  workspaceData,
} from '../examples/shared/src/headless';
const context = () => ({
  signal: new AbortController().signal,
  scope: 'alice',
});
const plan = (patch: Partial<DataPlan> = {}) =>
  dataPlanSchema.parse({
    sourceId: 'activity',
    project: ['id', 'hours'],
    ...patch,
  });
it('joins approved datasets, computes, filters, groups and maps complete results with stable identities', async () => {
  const query = plan({
    joins: [{ relationId: 'activity-team', kind: 'inner', alias: 'team' }],
    computed: {
      doubled: { op: 'multiply', args: [{ field: 'hours' }, { literal: 2 }] },
    },
    filter: { op: 'gt', args: [{ field: 'doubled' }, { literal: 6 }] },
    groupBy: ['team.name'],
    aggregates: {
      sum: { op: 'sum', field: 'doubled' },
      average: { op: 'average', field: 'hours' },
      count: { op: 'count' },
    },
    sort: [{ field: 'sum', direction: 'desc' }],
    project: ['team.name', 'sum', 'average', 'count'],
  });
  const options = { registry, ...workspaceData() };
  const first = await executeDataPlan(query, options, context(), 'workspace');
  expect(first.rows).toEqual([
    { 'team.name': 'Engineering', sum: 20, average: 10, count: 1 },
    { 'team.name': 'Design', sum: 10, average: 5, count: 1 },
  ]);
  expect(
    (await executeDataPlan(query, options, context(), 'workspace')).keys,
  ).toEqual(first.keys);
});
it('rejects unavailable fields, undeclared joins, incompatible formulas and incomplete local sources', () => {
  expect(() =>
    validateDataPlan(plan({ project: ['secret'] }), registry, 'workspace'),
  ).toThrow('projection');
  expect(() =>
    validateDataPlan(
      plan({ joins: [{ relationId: 'unknown', kind: 'left', alias: 'x' }] }),
      registry,
      'workspace',
    ),
  ).toThrow('relationship');
  expect(() =>
    validateDataPlan(
      plan({
        computed: {
          wrong: { op: 'add', args: [{ field: 'id' }, { literal: 1 }] },
        },
      }),
      registry,
      'workspace',
    ),
  ).toThrow('numeric');
  const partial = structuredClone(registry);
  partial.sources[0]!.completeness = 'partial';
  expect(() => validateDataPlan(plan(), partial, 'workspace')).toThrow(
    'complete',
  );
  const restricted = structuredClone(registry);
  restricted.surfaces[0]!.policy!.sourceFields.activity = ['id'];
  expect(() => validateDataPlan(plan(), restricted, 'workspace')).toThrow(
    'projection',
  );
});
it('preserves left-join nulls and handles division by zero without inventing numbers', async () => {
  const data = workspaceData();
  const source = registry.sources[0]!;
  data.sources.activity = createLocalSource(source, async () => [
    { id: 'missing', teamId: 'none', hours: 0, done: false },
  ]);
  const result = await executeDataPlan(
    plan({
      joins: [{ relationId: 'activity-team', kind: 'left', alias: 'team' }],
      computed: {
        ratio: { op: 'divide', args: [{ literal: 1 }, { field: 'hours' }] },
      },
      project: ['team.name', 'ratio'],
    }),
    { registry, ...data },
    context(),
    'workspace',
  );
  expect(result.rows).toEqual([{ 'team.name': null, ratio: null }]);
});
it('rejects cardinality violations, row expansion, computation budgets and cancelled work', async () => {
  const options = { registry, ...workspaceData() };
  await expect(
    executeDataPlan(plan(), { ...options, maxRows: 1 }, context(), 'workspace'),
  ).rejects.toThrow('budget');
  await expect(
    executeDataPlan(
      plan({ sort: [{ field: 'hours', direction: 'desc' }] }),
      { ...options, maxOperations: 1 },
      context(),
      'workspace',
    ),
  ).rejects.toThrow('budget');
  const controller = new AbortController();
  controller.abort();
  await expect(
    executeDataPlan(
      plan(),
      options,
      { ...context(), signal: controller.signal },
      'workspace',
    ),
  ).rejects.toThrow('cancel');
  const teams = registry.sources[1]!;
  options.sources.teams = createLocalSource(teams, async () => [
    { id: 'a', name: 'A', target: 1 },
    { id: 'b', name: 'A', target: 2 },
  ]);
  const changed = structuredClone(registry);
  changed.relations[0]!.rightField = 'name';
  await expect(
    executeDataPlan(
      plan({
        joins: [{ relationId: 'activity-team', kind: 'inner', alias: 'team' }],
      }),
      { ...options, registry: changed },
      context(),
      'workspace',
    ),
  ).rejects.toThrow('cardinality');
  changed.relations[0]!.cardinality = 'one-to-many';
  options.sources.activity = createLocalSource(
    registry.sources[0]!,
    async () => [{ id: 'one', teamId: 'A', hours: 1, done: false }],
  );
  // Each input fits the budget; two approved one-to-many joins expand one row to four.
  await expect(
    executeDataPlan(
      plan({
        joins: [
          { relationId: 'activity-team', kind: 'inner', alias: 'first' },
          { relationId: 'activity-team', kind: 'left', alias: 'second' },
        ],
      }),
      { ...options, registry: changed, maxRows: 3 },
      context(),
      'workspace',
    ),
  ).rejects.toThrow('Join result exceeds');
});
it('requires an explicit remote adapter and validates its projected data', async () => {
  const remotePlan = plan({ execution: 'remote' });
  const options = { registry, ...workspaceData() };
  await expect(
    executeDataPlan(remotePlan, options, context(), 'workspace'),
  ).rejects.toThrow('remote data adapter');
  const execute = vi.fn(async () => ({
    rows: [{ id: 'a', hours: 5 }],
    keys: ['a'],
    complete: true,
    nextCursor: null,
  }));
  await executeDataPlan(
    remotePlan,
    { ...options, remote: { execute } },
    context(),
    'workspace',
  );
  expect(execute).toHaveBeenCalledWith(
    remotePlan,
    expect.objectContaining({
      scope: 'alice',
      appId: registry.appId,
      registryRevision: registry.revision,
      surfaceId: 'workspace',
    }),
    undefined,
  );
  const remote = {
    async execute() {
      return {
        rows: [{ id: 'a', hours: 5, secret: 'no' }],
        keys: ['a'],
        complete: true,
        nextCursor: null,
      };
    },
  };
  await expect(
    executeDataPlan(remotePlan, { ...options, remote }, context(), 'workspace'),
  ).rejects.toThrow();
});
it('supports deterministic conditionals, strings and null handling with bounded expression trees', () => {
  const expression = {
    op: 'coalesce' as const,
    args: [
      { literal: null },
      {
        op: 'concat' as const,
        args: [{ literal: 'Hello ' }, { literal: 'world' }],
      },
    ],
  };
  expect(expressionType(expression, {}).type).toBe('string');
  expect(evaluateExpression(expression, {})).toBe('Hello world');
  let nested: import('@customitin/core').Expression = { literal: true };
  for (let i = 0; i < 9; i++) nested = { op: 'not', args: [nested] };
  expect(() => expressionType(nested, {})).toThrow('budget');
});
