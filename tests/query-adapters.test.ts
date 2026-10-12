import { QueryClient } from '@tanstack/react-query';
import { expect, it, vi } from 'vitest';
import {
  createCachedSource,
  createQuerySource,
  queryInvalidation,
} from '../packages/react-native/src/adapters/query';
import { registries } from '../examples/shared/src/registry';

const descriptor = registries.recipe.sources[0]!;
const query = { filters: [], sort: [] };
const context = () => ({ scope: 'one', signal: new AbortController().signal });
it('projects approved fields and validates completeness before local filtering', async () => {
  const source = {
    ...descriptor,
    fields: {
      id: descriptor.fields.id!,
      title: descriptor.fields.title!,
      note: { ...descriptor.fields.note!, required: false, nullable: true },
    },
  };
  const adapter = createCachedSource(source, async () => [
    { id: '1', title: 'Visible', secret: 'not approved' },
  ]);
  const result = await adapter.query(query, context());
  expect(result.items).toEqual([{ id: '1', title: 'Visible', note: null }]);
  const invalid = createCachedSource(source, async () => [
    { id: '1', title: 'A' },
    { id: '1', title: 'B' },
  ]);
  await expect(invalid.query(query, context())).rejects.toThrow('Duplicate');
});
it('passes validated queries and cursors to remote loaders and rejects unsupported filters first', async () => {
  const remote = {
    ...descriptor,
    completeness: 'paginated' as const,
    supportsGrouping: false,
  };
  const load = vi.fn(async () => ({
    items: [],
    nextCursor: 'next',
    complete: false,
    totalCount: 7,
  }));
  const source = createQuerySource(remote, load);
  const ctx = context();
  expect(await source.query(query, ctx, 'cursor')).toMatchObject({
    nextCursor: 'next',
    totalCount: 7,
  });
  expect(load).toHaveBeenCalledWith(query, ctx, 'cursor');
  await expect(
    source.query(
      { filters: [{ field: 'missing', op: 'eq', value: 1 }], sort: [] },
      ctx,
    ),
  ).rejects.toThrow('Unknown field');
  expect(load).toHaveBeenCalledTimes(1);
});
it('responds to cache invalidation and manual edits without refetch feedback loops', async () => {
  const client = new QueryClient();
  const listener = vi.fn();
  const stop = queryInvalidation(client.getQueryCache(), () => ['entries'])(
    listener,
  );
  await client.fetchQuery({
    queryKey: ['entries', 'customitin-scope', 'one'],
    queryFn: async () => ['A'],
  });
  expect(listener).not.toHaveBeenCalled();
  client.setQueryData(['unrelated'], ['B']);
  expect(listener).not.toHaveBeenCalled();
  await client.invalidateQueries({ queryKey: ['entries'] });
  expect(listener).toHaveBeenCalledTimes(1);
  client.setQueryData(['entries', 'customitin-scope', 'one'], ['C']);
  expect(listener).toHaveBeenCalledTimes(2);
  stop();
  client.setQueryData(['entries'], ['D']);
  expect(listener).toHaveBeenCalledTimes(2);
  client.clear();
});
it('cancels waiting without allowing a late cache response to activate an old scope', async () => {
  const abort = new AbortController();
  const adapter = createCachedSource(descriptor, () => new Promise(() => {}));
  const result = adapter.query(query, { scope: 'old', signal: abort.signal });
  abort.abort();
  await expect(result).rejects.toThrow();
});

it('rejects a source-bound renderer on another collection', async () => {
  const { validateView } = await import('@customitin/core');
  const registry = {
    ...registries.recipe,
    components: registries.recipe.components.map((c) =>
      c.id === 'card' ? { ...c, sourceIds: ['another-source'] } : c,
    ),
  };
  expect(() =>
    validateView(
      {
        id: 'personal',
        title: 'Personal',
        sourceId: 'catalog',
        query,
        presentation: {
          itemRendererId: 'card',
          mode: 'list',
          density: 'comfortable',
        },
      },
      registry,
    ),
  ).toThrow('does not support');
});
