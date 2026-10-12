import { expect, it } from 'vitest';
import {
  createLocalSource,
  validatePage,
  type QueryContext,
} from '@customitin/core';
import { registries } from '../examples/shared/src/registry';
import { recipes } from '../examples/shared/src/data';
import { dataRoute } from '../examples/planner-server/src/data-routes';
const context: QueryContext = {
  signal: new AbortController().signal,
  scope: 'alice',
};
it('filters and sorts a complete local repository against an independent expected result', async () => {
  const source = createLocalSource(
    registries.recipe.sources[0]!,
    async () => recipes,
  );
  const page = await source.query(
    {
      filters: [{ field: 'minutes', op: 'lte', value: 25 }],
      sort: [{ field: 'minutes', direction: 'asc' }],
    },
    context,
  );
  expect(page.items.map((r) => r.id)).toEqual(['r6', 'r2', 'r1', 'r3']);
  expect(page.complete).toBe(true);
  expect(page.totalCount).toBe(4);
});
it('filters the entire remote collection before paginating', async () => {
  const query = encodeURIComponent(
    JSON.stringify({
      filters: [{ field: 'watched', op: 'eq', value: false }],
      sort: [{ field: 'year', direction: 'asc' }],
    }),
  );
  const first = await dataRoute(
    new Request(`http://localhost/movies?query=${query}`),
  )?.json();
  const second = await dataRoute(
    new Request(
      `http://localhost/movies?query=${query}&cursor=${first.nextCursor}`,
    ),
  )?.json();
  expect([...first.items, ...second.items].map((r) => r.id)).toEqual([
    'm4',
    'm5',
    'm2',
    'm1',
  ]);
  expect(first.totalCount).toBe(4);
  expect(second.nextCursor).toBeNull();
});
it('rejects incomplete local data, missing IDs and cancellation', async () => {
  const descriptor = registries.recipe.sources[0]!;
  expect(() =>
    validatePage(
      { items: [], nextCursor: 'more', complete: false },
      descriptor,
    ),
  ).toThrow('partial');
  expect(() =>
    validatePage(
      { items: [{ title: 'broken' }], nextCursor: null, complete: true },
      descriptor,
    ),
  ).toThrow();
  const controller = new AbortController();
  controller.abort();
  const source = createLocalSource(descriptor, async () => recipes);
  await expect(
    source.query(
      { filters: [], sort: [] },
      { ...context, signal: controller.signal },
    ),
  ).rejects.toThrow();
});
