import { throwIfAborted } from '@customitin/core';
import { QueryClient } from '@tanstack/react-query';
import {
  createLocalSource,
  filterRows,
  validatePage,
  type QueryContext,
  type Row,
  type SourceAdapter,
} from '@customitin/core';
import { demoData, type DemoKind } from './data';
import { registries } from './registry';
const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false } },
});
const subscribers = new Set<() => void>();
export const dataUrl = process.env.EXPO_PUBLIC_DATA_URL;
export function createDemoSource(kind: DemoKind): SourceAdapter {
  const descriptor = registries[kind].sources[0];
  if (!descriptor) throw new Error('Missing demo source');
  if (kind === 'recipe')
    return createLocalSource(descriptor, async () => demoData.recipe);
  if (kind === 'task')
    return createLocalSource(
      descriptor,
      async (context: QueryContext) =>
        queryClient.fetchQuery({
          queryKey: ['tasks', context.scope],
          staleTime: 0,
          queryFn: async () => {
            if (!dataUrl) return demoData.task;
            const response = await fetch(`${dataUrl}/tasks`, {
              signal: context.signal,
            });
            if (!response.ok) throw new Error('Task service unavailable');
            return (await response.json()) as Row[];
          },
        }),
      (onChange) => {
        subscribers.add(onChange);
        return () => subscribers.delete(onChange);
      },
    );
  return {
    descriptor,
    async query(query, context, cursor) {
      throwIfAborted(context.signal);
      if (dataUrl) {
        const response = await fetch(
          `${dataUrl}/movies?query=${encodeURIComponent(JSON.stringify(query))}&cursor=${encodeURIComponent(cursor ?? '0')}`,
          { signal: context.signal },
        );
        if (!response.ok) throw new Error('Movie service unavailable');
        return validatePage(await response.json(), descriptor);
      }
      // An explicitly labelled in-process fake server; filtering precedes pagination.
      const rows = filterRows(demoData.movie, query);
      const offset = Number(cursor ?? 0);
      const items = rows.slice(offset, offset + descriptor.pageSize);
      const next = offset + items.length;
      return {
        items,
        totalCount: rows.length,
        nextCursor: next < rows.length ? String(next) : null,
        complete: next >= rows.length,
      };
    },
  };
}
export async function completeTask(id: string): Promise<void> {
  if (dataUrl) {
    const response = await fetch(
      `${dataUrl}/tasks/${encodeURIComponent(id)}/complete`,
      { method: 'POST' },
    );
    if (!response.ok) throw new Error('Task could not be updated');
  } else {
    const task = demoData.task.find((row) => row.id === id);
    if (task) task.completed = true;
  }
  await queryClient.invalidateQueries({ queryKey: ['tasks'] });
  subscribers.forEach((listener) => listener());
}
